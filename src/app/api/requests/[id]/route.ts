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

    // GUARD: Only rejected requests can be resubmitted
    if (existingRequest.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected requests can be resubmitted' },
        { status: 400 },
      );
    }

    // GUARD: Only the owner can resubmit
    if (existingRequest.userId !== Number(session!.user.id)) {
      return NextResponse.json(
        { error: 'You can only edit your own requests' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { description, evidenceFileUrl, categoryId } = body;

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
      description: description || existingRequest.description,
      evidenceFileUrl:
        evidenceFileUrl !== undefined
          ? evidenceFileUrl
          : existingRequest.evidenceFileUrl,
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
        updateData.appliedHours = 0;
      } else {
        updateData.activityType = newCategory.activityType;
        updateData.appliedHours = newCategory.assignedHours;
      }
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

    // GUARD: Only the owner or admin can delete
    if (!isAdmin && existingRequest.userId !== Number(session!.user.id)) {
      return NextResponse.json(
        { error: 'You can only delete your own requests' },
        { status: 403 },
      );
    }

    await prisma.activityRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/requests/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
