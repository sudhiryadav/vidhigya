const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProcessingDocuments() {
    try {
        console.log('🔍 Checking documents in processing status...\n');

        const processingDocs = await prisma.legalDocument.findMany({
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

        console.log(
            `Found ${processingDocs.length} documents in processing status:\n`,
        );

        processingDocs.forEach((doc, index) => {
            console.log(`${index + 1}. Document ID: ${doc.id}`);
            console.log(`   Title: ${doc.title}`);
            console.log(`   AI Document ID: ${doc.aiDocumentId}`);
            console.log(`   Status: ${doc.status}`);
            console.log(`   Last Updated: ${doc.updatedAt}`);
            console.log(`   Uploaded By: ${doc.uploadedById}`);
            console.log('');
        });

        if (processingDocs.length === 0) {
            console.log('✅ No documents currently in processing status.');
        }
    } catch (error) {
        console.error('❌ Error checking processing documents:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProcessingDocuments();
