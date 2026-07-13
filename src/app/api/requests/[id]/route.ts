import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session, dbUser } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const requestId = Number(id);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const activityRequest = await prisma.activityRequest.findUnique({
      where: { id: requestId },
      include: { category: true },
    });

    if (!activityRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 },
      );
    }

    // GUARD: Only the owner or admin can view
    const isAdmin = dbUser?.role === 'ADMIN';
    if (!isAdmin && activityRequest.userId !== Number(session!.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 },
      );
    }

    return NextResponse.json(activityRequest);
  } catch (error) {
    console.error('GET /api/requests/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const requestId = Number(id);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const existingRequest = await prisma.activityRequest.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 },
      );
    }

    // GUARD: Only pending or rejected requests can be edited/resubmitted
    if (existingRequest.status !== 'REJECTED' && existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending or rejected requests can be modified' },
        { status: 400 },
      );
    }

    // GUARD: Only the owner, creator, or admin can resubmit
    const isOwner = existingRequest.userId === Number(session!.user.id);
    const isCreator = existingRequest.createdById === Number(session!.user.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: Number(session!.user.id) },
    });
    const isAdmin = dbUser?.role === 'ADMIN';

    if (!isOwner && !isCreator && !isAdmin) {
      return NextResponse.json(
        { error: '본인의 신청만 수정할 수 있습니다.' },        { status: 403 },
      );
    }

    const body = await request.json();
    const { description, evidenceFileUrl, categoryId, appliedHours, activityDate, userIds } = body;

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 5 || description.length > 2000) {
        return NextResponse.json(
          { error: 'Description must be between 5 and 2000 characters long' },
          { status: 400 },
        );
      }
    }

    if (evidenceFileUrl !== undefined && evidenceFileUrl !== null && evidenceFileUrl !== '') {
      const isValidUrl = /^\/api\/files\/[a-f0-9-]{36}$/.test(evidenceFileUrl);
      if (!isValidUrl) {
        return NextResponse.json(
          { error: 'Invalid evidence file URL format' },
          { status: 400 },
        );
      }
    }

    // Build update data
    const updateData: Prisma.ActivityRequestUncheckedUpdateInput = {
      description: description !== undefined ? description : existingRequest.description,
      evidenceFileUrl:
        evidenceFileUrl !== undefined
          ? evidenceFileUrl
          : existingRequest.evidenceFileUrl,
      activityDate: activityDate !== undefined ? new Date(activityDate) : existingRequest.activityDate,
      status: 'PENDING',
      rejectedReason: null,
    };

    // If categoryId changed, re-snapshot from new category
    if (categoryId && categoryId !== existingRequest.categoryId) {
      const newCategory = await prisma.activityCategory.findUnique({
        where: { id: categoryId },
      });

      if (!newCategory) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 },
        );
      }

      updateData.categoryId = categoryId;

      if (newCategory.assignedHours === 0) {
        updateData.activityType = '';
        updateData.appliedHours = appliedHours !== undefined ? Number(appliedHours) : 0;
      } else {
        updateData.activityType = newCategory.activityType;
        updateData.appliedHours = newCategory.assignedHours;
      }
    } else if (appliedHours !== undefined) {
      // Even if categoryId didn't change, allow updating hours if the category is variable hours (assignedHours === 0)
      const currentCategory = await prisma.activityCategory.findUnique({
        where: { id: existingRequest.categoryId },
      });
      if (currentCategory && currentCategory.assignedHours === 0) {
        updateData.appliedHours = Number(appliedHours);
      }
    }

    // Bulk update OR conversion to bulk request
    const isBulkEdit = existingRequest.bulkLabel || (Array.isArray(userIds) && userIds.length >= 2);

    if (isBulkEdit && Array.isArray(userIds)) {
      if (userIds.length === 0) {
        return NextResponse.json(
          { error: '통합 신청에는 최소 1명 이상의 인원이 필요합니다.' },
          { status: 400 },
        );
      }

      // Fetch all requests sharing the same bulkLabel if it exists, otherwise just this request
      const existingBulkRequests = existingRequest.bulkLabel
        ? await prisma.activityRequest.findMany({
            where: { bulkLabel: existingRequest.bulkLabel },
          })
        : [existingRequest];

      const dbUser = await prisma.user.findUnique({
        where: { id: Number(session!.user.id) },
      });
      const isAdmin = dbUser?.role === 'ADMIN';

      // GUARD: Check if any of the existing bulk requests have been APPROVED
      const hasApproved = existingBulkRequests.some(r => r.status === 'APPROVED');
      if (!isAdmin && hasApproved) {
        return NextResponse.json(
          { error: '승인된 활동이 포함된 통합 신청은 수정할 수 없습니다.' },
          { status: 400 },
        );
      }

      const isOwner = existingBulkRequests.every(r => r.createdById === Number(session!.user.id) || r.userId === Number(session!.user.id));
      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: 'You are not authorized to edit this request' },
          { status: 403 },
        );
      }

      // Determine final bulkLabel name or clear it if it becomes a single request (only 1 user left)
      let newBulkLabel: string | null = null;
      const finalActivityDate = updateData.activityDate !== undefined ? (updateData.activityDate as Date) : existingRequest.activityDate;

      if (userIds.length >= 2) {
        const dateStr = finalActivityDate.toISOString().slice(0, 10);
        newBulkLabel = `일괄신청_${dateStr}`;
      } else {
        newBulkLabel = null;
      }

      // Calculate diff for userIds
      const toDeleteIds = existingBulkRequests
        .filter(r => !userIds.includes(r.userId))
        .map(r => r.id);

      const toUpdateIds = existingBulkRequests
        .filter(r => userIds.includes(r.userId))
        .map(r => r.id);

      const toCreateUserIds = userIds.filter(
        id => !existingBulkRequests.map(r => r.userId).includes(id)
      );

      // Verify new users exist and are ACTIVE
      if (toCreateUserIds.length > 0) {
        const activeUsers = await prisma.user.findMany({
          where: {
            id: { in: toCreateUserIds },
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        const validNewUserIds = activeUsers.map(u => u.id);
        if (validNewUserIds.length !== toCreateUserIds.length) {
          return NextResponse.json(
            { error: '선택된 유저 중 비활성화되었거나 존재하지 않는 유저가 있습니다.' },
            { status: 400 },
          );
        }
      }

      // Compute details for new requests
      const finalCategoryId = updateData.categoryId !== undefined ? (updateData.categoryId as number) : existingRequest.categoryId;
      const finalAppliedHours = updateData.appliedHours !== undefined ? (updateData.appliedHours as number) : existingRequest.appliedHours;
      const finalActivityType = updateData.activityType !== undefined ? (updateData.activityType as string) : existingRequest.activityType;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Delete removed users
        if (toDeleteIds.length > 0) {
          await tx.activityRequest.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }

        // 2. Update remaining users
        if (toUpdateIds.length > 0) {
          await tx.activityRequest.updateMany({
            where: { id: { in: toUpdateIds } },
            data: {
              categoryId: finalCategoryId,
              activityType: finalActivityType,
              appliedHours: finalAppliedHours,
              description: updateData.description as string,
              evidenceFileUrl: updateData.evidenceFileUrl as string | null,
              activityDate: finalActivityDate,
              bulkLabel: newBulkLabel,
              status: 'PENDING',
              rejectedReason: null,
            },
          });
        }

        // 3. Create newly added users
        for (const userId of toCreateUserIds) {
          await tx.activityRequest.create({
            data: {
              userId,
              categoryId: finalCategoryId,
              activityType: finalActivityType,
              appliedHours: finalAppliedHours,
              description: updateData.description as string,
              evidenceFileUrl: updateData.evidenceFileUrl as string | null,
              activityDate: finalActivityDate,
              bulkLabel: newBulkLabel,
              status: 'PENDING',
              createdById: Number(session!.user.id),
            },
          });
        }

        // Return one of the updated/created records
        return tx.activityRequest.findFirst({
          where: newBulkLabel ? { bulkLabel: newBulkLabel } : { id: requestId },
          include: { category: true },
        });
      });

      return NextResponse.json(result);
    }

    const updated = await prisma.activityRequest.update({
      where: { id: requestId },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/requests/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error, session, dbUser } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const requestId = Number(id);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const existingRequest = await prisma.activityRequest.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 },
      );
    }

    // Check if user is admin
    const isAdmin = dbUser?.role === 'ADMIN';

    // GUARD: Approved requests are immutable for normal users
    if (!isAdmin && existingRequest.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Approved requests cannot be deleted' },
        { status: 400 },
      );
    }

    // GUARD: In bulk delete, block if any requests under the bulkLabel are APPROVED
    if (!isAdmin && existingRequest.bulkLabel) {
      const approvedCount = await prisma.activityRequest.count({
        where: {
          bulkLabel: existingRequest.bulkLabel,
          status: 'APPROVED',
        },
      });
      if (approvedCount > 0) {
        return NextResponse.json(
          { error: '승인된 활동이 포함된 통합 신청은 삭제할 수 없습니다.' },
          { status: 400 },
        );
      }
    }

    // GUARD: Only the owner, creator or admin can delete
    const isRequestOwner = existingRequest.userId === Number(session!.user.id);
    const isRequestCreator = existingRequest.createdById === Number(session!.user.id);


    if (!isAdmin && !isRequestOwner && !isRequestCreator) {
      return NextResponse.json(
        { error: '본인의 신청만 삭제할 수 있습니다.' },
        { status: 403 },
      );
    }

    if (existingRequest.bulkLabel) {
      await prisma.activityRequest.deleteMany({
        where: {
          bulkLabel: existingRequest.bulkLabel,
          categoryId: existingRequest.categoryId,
          description: existingRequest.description,
        },
      });
    } else {
      await prisma.activityRequest.delete({
        where: { id: requestId },
      });
    }

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/requests/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
