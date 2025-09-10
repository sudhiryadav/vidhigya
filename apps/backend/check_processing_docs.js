const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProcessingDocuments() {
    try {
        await prisma.legalDocument.findMany({
            where: {
                status: 'PROCESSING',
            },
            select: {
                id: true,
                title: true,
                aiDocumentId: true,
                status: true,
                updatedAt: true,
                uploadedById: true,
            },
        });
    } catch (error) {
        console.error('❌ Error checking processing documents:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProcessingDocuments();
