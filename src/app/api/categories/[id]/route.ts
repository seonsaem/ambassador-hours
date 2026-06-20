import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import { Prisma } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const existing = await prisma.activityCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { categoryName, activityType, assignedHours, isActive } = body;

    // Validate activityType if provided
    if (activityType && !['OFFICIAL', 'AUTONOMOUS'].includes(activityType)) {
      return NextResponse.json(
        { error: 'activityType must be OFFICIAL or AUTONOMOUS' },
        { status: 400 },
      );
    }

    const updateData: Prisma.ActivityCategoryUpdateInput = {};
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (activityType !== undefined) updateData.activityType = activityType;
    if (assignedHours !== undefined)
      updateData.assignedHours = Number(assignedHours);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.activityCategory.update({
      where: { id: categoryId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error);
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
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const categoryId = Number(id);

    if (isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const existing = await prisma.activityCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    // Soft delete: set isActive to false
    const updated = await prisma.activityCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
