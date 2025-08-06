const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDocumentIds() {
    try {
        console.log('Starting to fix document IDs...');

        // Get all documents that have aiDocumentId set
        const documents = await prisma.legalDocument.findMany({
            where: {
                aiDocumentId: {
                    not: null
                }
            },
            select: {
                id: true,
                aiDocumentId: true,
                title: true,
                originalFilename: true
            }
        });

        console.log(`Found ${documents.length} documents with aiDocumentId`);

        for (const doc of documents) {
            // If aiDocumentId is different from the database id, update it
            if (doc.aiDocumentId !== doc.id) {
                console.log(`Fixing document: ${doc.title || doc.originalFilename}`);
                console.log(`  Old aiDocumentId: ${doc.aiDocumentId}`);
                console.log(`  New aiDocumentId: ${doc.id}`);

                await prisma.legalDocument.update({
                    where: { id: doc.id },
                    data: { aiDocumentId: doc.id }
                });
            }
        }

        console.log('Document ID fix completed!');
    } catch (error) {
        console.error('Error fixing document IDs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDocumentIds(); 