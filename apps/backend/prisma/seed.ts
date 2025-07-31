import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@vidhigya.com' },
    update: {},
    create: {
      email: 'admin@vidhigya.com',
      password: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+1 (555) 000-0001',
      isActive: true,
    },
  });

  // Create Lawyers
  const lawyerPassword = await bcrypt.hash('lawyer123', 10);
  const lawyer1 = await prisma.user.upsert({
    where: { email: 'lawyer@vidhigya.com' },
    update: {},
    create: {
      email: 'lawyer@vidhigya.com',
      password: lawyerPassword,
      name: 'Laywer John',
      role: 'LAWYER',
      phone: '+1 (555) 123-4567',
      isActive: true,
    },
  });

  const lawyer2 = await prisma.user.upsert({
    where: { email: 'sarah.johnson@vidhigya.com' },
    update: {},
    create: {
      email: 'sarah.johnson@vidhigya.com',
      password: lawyerPassword,
      name: 'Sarah Johnson',
      role: 'LAWYER',
      phone: '+1 (555) 234-5678',
      isActive: true,
    },
  });

  // Create Associates
  const associatePassword = await bcrypt.hash('associate123', 10);
  const associate1 = await prisma.user.upsert({
    where: { email: 'mike.wilson@vidhigya.com' },
    update: {},
    create: {
      email: 'mike.wilson@vidhigya.com',
      password: associatePassword,
      name: 'Mike Wilson',
      role: 'ASSOCIATE',
      phone: '+1 (555) 345-6789',
      isActive: true,
    },
  });

  // Create Paralegals
  const paralegalPassword = await bcrypt.hash('paralegal123', 10);
  const paralegal1 = await prisma.user.upsert({
    where: { email: 'emily.davis@vidhigya.com' },
    update: {},
    create: {
      email: 'emily.davis@vidhigya.com',
      password: paralegalPassword,
      name: 'Emily Davis',
      role: 'PARALEGAL',
      phone: '+1 (555) 456-7890',
      isActive: true,
    },
  });

  // Create Clients
  const clientPassword = await bcrypt.hash('client123', 10);
  const client1 = await prisma.user.upsert({
    where: { email: 'client@vidhigya.com' },
    update: {},
    create: {
      email: 'client@vidhigya.com',
      password: clientPassword,
      name: 'Client Jane',
      role: 'CLIENT',
      phone: '+1 (555) 567-8901',
      isActive: true,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'robert.brown@vidhigya.com' },
    update: {},
    create: {
      email: 'robert.brown@vidhigya.com',
      password: clientPassword,
      name: 'Robert Brown',
      role: 'CLIENT',
      phone: '+1 (555) 678-9012',
      isActive: true,
    },
  });

  const client3 = await prisma.user.upsert({
    where: { email: 'maria.garcia@vidhigya.com' },
    update: {},
    create: {
      email: 'maria.garcia@vidhigya.com',
      password: clientPassword,
      name: 'Maria Garcia',
      role: 'CLIENT',
      phone: '+1 (555) 789-0123',
      isActive: true,
    },
  });

  const client4 = await prisma.user.upsert({
    where: { email: 'david.lee@vidhigya.com' },
    update: {},
    create: {
      email: 'david.lee@vidhigya.com',
      password: clientPassword,
      name: 'David Lee',
      role: 'CLIENT',
      phone: '+1 (555) 890-1234',
      isActive: true,
    },
  });

  // Create Legal Cases
  const case1 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-001',
      title: 'Smith vs Johnson - Property Dispute',
      description: 'Property boundary dispute between neighbors',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'PROPERTY',
      courtId: (
        await prisma.court.findFirst({
          where: { name: 'Tis Hazari District Court' },
        })
      )?.id,
      judge: "Hon'ble Justice Ramesh Kumar",
      opposingParty: 'Johnson Family',
      opposingLawyer: 'Adv. Sarah Wilson',
      assignedLawyerId: lawyer1.id,
      clientId: client1.id,
      nextHearingDate: new Date('2024-03-20T10:00:00Z'),
    },
  });

  const case2 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-002',
      title: 'Employment Discrimination Case',
      description: 'Workplace discrimination lawsuit',
      status: 'OPEN',
      priority: 'MEDIUM',
      category: 'LABOR',
      courtId: (
        await prisma.court.findFirst({ where: { name: 'Delhi Labor Court' } })
      )?.id,
      judge: "Hon'ble Justice Priya Sharma",
      opposingParty: 'TechCorp Solutions Ltd.',
      opposingLawyer: 'Adv. Michael Brown',
      assignedLawyerId: lawyer2.id,
      clientId: client2.id,
      nextHearingDate: new Date('2024-03-25T14:30:00Z'),
    },
  });

  const case3 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-003',
      title: 'Contract Breach - Tech Startup',
      description: 'Breach of contract in software development agreement',
      status: 'PENDING',
      priority: 'HIGH',
      category: 'CORPORATE',
      courtId: (
        await prisma.court.findFirst({
          where: { name: 'City Civil and Sessions Court, Mumbai' },
        })
      )?.id,
      judge: "Hon'ble Justice Amit Patel",
      opposingParty: 'InnovateTech Solutions',
      opposingLawyer: 'Adv. Rajesh Kumar',
      assignedLawyerId: lawyer1.id,
      clientId: client3.id,
      nextHearingDate: new Date('2024-03-28T09:00:00Z'),
    },
  });

  const case4 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-004',
      title: 'Personal Injury - Car Accident',
      description: 'Personal injury claim from automobile accident',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      category: 'CIVIL',
      courtId: (
        await prisma.court.findFirst({
          where: { name: 'City Civil Court, Chennai' },
        })
      )?.id,
      judge: "Hon'ble Justice Lakshmi Devi",
      opposingParty: 'Metro Transport Co.',
      opposingLawyer: 'Adv. David Chen',
      assignedLawyerId: lawyer2.id,
      clientId: client4.id,
      nextHearingDate: new Date('2024-04-02T11:00:00Z'),
    },
  });

  const case5 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-005',
      title: 'Divorce Settlement',
      description: 'Complex divorce case with property division',
      status: 'OPEN',
      priority: 'LOW',
      category: 'FAMILY',
      courtId: (
        await prisma.court.findFirst({ where: { name: 'Family Court, Delhi' } })
      )?.id,
      judge: "Hon'ble Justice Meera Singh",
      opposingParty: 'Spouse',
      opposingLawyer: 'Adv. Jennifer Adams',
      assignedLawyerId: lawyer1.id,
      clientId: client1.id,
      createdAt: new Date('2024-12-15T10:00:00Z'), // Last month
    },
  });

  // Add a case from this month to demonstrate the new case counter
  const case6 = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2025-001',
      title: 'New Corporate Contract Review',
      description: 'Review of new corporate partnership agreement',
      status: 'OPEN',
      priority: 'HIGH',
      category: 'CORPORATE',
      courtId: (
        await prisma.court.findFirst({
          where: { name: 'National Company Law Tribunal' },
        })
      )?.id,
      judge: "Hon'ble Justice Sanjay Verma",
      opposingParty: 'Global Enterprises Ltd.',
      opposingLawyer: 'Adv. Robert Johnson',
      assignedLawyerId: lawyer1.id,
      clientId: client2.id,
      createdAt: new Date(), // This month (current date)
    },
  });

  // Create Legal Documents
  await prisma.legalDocument.create({
    data: {
      title: 'Initial Complaint',
      description: 'Original complaint filed with the court',
      fileUrl: './uploads/documents/complaint.pdf',
      fileType: 'application/pdf',
      fileSize: 1024000,
      category: 'PETITION',
      status: 'FILED',
      caseId: case1.id,
      uploadedById: lawyer1.id,
    },
  });

  await prisma.legalDocument.create({
    data: {
      title: 'Evidence - Property Survey',
      description: 'Survey report showing property boundaries',
      fileUrl:
        'https://vidhigya-documents.s3.us-east-1.amazonaws.com/documents/survey.pdf',
      fileType: 'application/pdf',
      fileSize: 2048000,
      category: 'EVIDENCE',
      status: 'APPROVED',
      caseId: case1.id,
      uploadedById: associate1.id,
    },
  });

  await prisma.legalDocument.create({
    data: {
      title: 'Employment Contract',
      description: 'Original employment agreement',
      fileUrl:
        'https://vidhigya-documents.s3.us-east-1.amazonaws.com/documents/contract.pdf',
      fileType: 'application/pdf',
      fileSize: 1536000,
      category: 'CONTRACT',
      status: 'FILED',
      caseId: case2.id,
      uploadedById: lawyer2.id,
    },
  });

  await prisma.legalDocument.create({
    data: {
      title: 'Witness Statement - John Doe',
      description: 'Witness testimony regarding the incident',
      fileUrl:
        'https://vidhigya-documents.s3.us-east-1.amazonaws.com/documents/witness_statement.pdf',
      fileType: 'application/pdf',
      fileSize: 512000,
      category: 'EVIDENCE',
      status: 'APPROVED',
      caseId: case2.id,
      uploadedById: paralegal1.id,
    },
  });

  await prisma.legalDocument.create({
    data: {
      title: 'Software Development Agreement',
      description: 'Original contract between parties',
      fileUrl:
        'https://vidhigya-documents.s3.us-east-1.amazonaws.com/documents/software_contract.pdf',
      fileType: 'application/pdf',
      fileSize: 3072000,
      category: 'CONTRACT',
      status: 'FILED',
      caseId: case3.id,
      uploadedById: lawyer1.id,
    },
  });

  await prisma.legalDocument.create({
    data: {
      title: 'Medical Records',
      description: 'Hospital and medical treatment records',
      fileUrl:
        'https://vidhigya-documents.s3.us-east-1.amazonaws.com/documents/medical_records.pdf',
      fileType: 'application/pdf',
      fileSize: 4096000,
      category: 'EVIDENCE',
      status: 'APPROVED',
      caseId: case4.id,
      uploadedById: lawyer2.id,
    },
  });

  // Create Billing Records
  await prisma.billingRecord.create({
    data: {
      amount: 25000.0,
      description: 'Legal consultation and document preparation',
      billType: 'CONSULTATION',
      status: 'PENDING',
      dueDate: new Date('2024-03-15'),
      caseId: case1.id,
      userId: client1.id,
      currency: 'INR',
    },
  });

  await prisma.billingRecord.create({
    data: {
      amount: 15000.0,
      description: 'Court appearance fee',
      billType: 'COURT_APPEARANCE',
      status: 'PAID',
      dueDate: new Date('2024-02-28'),
      caseId: case2.id,
      userId: client2.id,
      currency: 'INR',
    },
  });

  await prisma.billingRecord.create({
    data: {
      amount: 32000.0,
      description: 'Contract review and negotiation',
      billType: 'CONSULTATION',
      status: 'PENDING',
      dueDate: new Date('2024-03-10'),
      caseId: case3.id,
      userId: client3.id,
      currency: 'INR',
    },
  });

  await prisma.billingRecord.create({
    data: {
      amount: 18000.0,
      description: 'Medical records review and analysis',
      billType: 'CONSULTATION',
      status: 'PENDING',
      dueDate: new Date('2024-03-20'),
      caseId: case4.id,
      userId: client4.id,
      currency: 'INR',
    },
  });

  await prisma.billingRecord.create({
    data: {
      amount: 9500.0,
      description: 'Initial consultation and case assessment',
      billType: 'CONSULTATION',
      status: 'PAID',
      dueDate: new Date('2024-02-15'),
      caseId: case5.id,
      userId: client1.id,
      currency: 'INR',
    },
  });

  // Add billing record for the new case
  await prisma.billingRecord.create({
    data: {
      amount: 45000.0,
      description: 'Corporate contract review and legal consultation',
      billType: 'CONSULTATION',
      status: 'PENDING',
      dueDate: new Date('2025-02-15'),
      caseId: case6.id,
      userId: client2.id,
      currency: 'INR',
    },
  });

  // Add a billing record for admin to use the superAdmin variable
  await prisma.billingRecord.create({
    data: {
      amount: 10000.0,
      description: 'System administration fee',
      billType: 'CONSULTATION',
      status: 'PAID',
      dueDate: new Date('2024-01-15'),
      userId: superAdmin.id,
      currency: 'INR',
    },
  });

  // Create Calendar Events
  const event1 = await prisma.calendarEvent.create({
    data: {
      title: 'Court Hearing - Smith vs Johnson',
      description: 'Initial hearing for property dispute case',
      startTime: new Date('2024-03-20T10:00:00Z'),
      endTime: new Date('2024-03-20T11:30:00Z'),
      eventType: 'HEARING',
      location: 'County Courthouse, Room 302',
      createdById: lawyer1.id,
      caseId: case1.id,
    },
  });

  const event2 = await prisma.calendarEvent.create({
    data: {
      title: 'Client Meeting - Employment Case',
      description: 'Strategy meeting with client for discrimination case',
      startTime: new Date('2024-03-22T14:00:00Z'),
      endTime: new Date('2024-03-22T15:00:00Z'),
      eventType: 'CLIENT_MEETING',
      location: 'Law Office Conference Room',
      createdById: lawyer2.id,
      caseId: case2.id,
    },
  });

  const event3 = await prisma.calendarEvent.create({
    data: {
      title: 'Mediation Session - Contract Dispute',
      description: 'Mediation for software development contract breach',
      startTime: new Date('2024-03-25T09:00:00Z'),
      endTime: new Date('2024-03-25T12:00:00Z'),
      eventType: 'OTHER',
      location: 'Mediation Center, Suite 100',
      createdById: lawyer1.id,
      caseId: case3.id,
    },
  });

  // Add participants to the events
  await prisma.eventParticipant.create({
    data: {
      eventId: event1.id,
      userId: lawyer1.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.eventParticipant.create({
    data: {
      eventId: event1.id,
      userId: client1.id,
      status: 'PENDING',
    },
  });

  await prisma.eventParticipant.create({
    data: {
      eventId: event2.id,
      userId: lawyer2.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.eventParticipant.create({
    data: {
      eventId: event2.id,
      userId: client2.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.eventParticipant.create({
    data: {
      eventId: event3.id,
      userId: lawyer1.id,
      status: 'ACCEPTED',
    },
  });

  await prisma.eventParticipant.create({
    data: {
      eventId: event3.id,
      userId: client3.id,
      status: 'PENDING',
    },
  });

  // Create Tasks
  await prisma.task.create({
    data: {
      title: 'Review evidence documents',
      description: 'Review and analyze all evidence for Smith vs Johnson case',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date('2024-03-18'),
      caseId: case1.id,
      createdById: lawyer1.id,
      assignedToId: associate1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Prepare witness statements',
      description:
        'Interview and prepare witness statements for employment case',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: new Date('2024-03-25'),
      caseId: case2.id,
      createdById: lawyer2.id,
      assignedToId: paralegal1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Draft settlement proposal',
      description: 'Prepare settlement proposal for contract dispute',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: new Date('2024-03-23'),
      caseId: case3.id,
      createdById: lawyer1.id,
      assignedToId: associate1.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Review medical records',
      description: 'Analyze medical records for personal injury case',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      dueDate: new Date('2024-03-30'),
      caseId: case4.id,
      createdById: lawyer2.id,
      assignedToId: paralegal1.id,
    },
  });

  // Create Notifications
  await prisma.notification.create({
    data: {
      title: 'New Case Assignment',
      message: 'You have been assigned to case CASE-2024-001',
      type: 'CASE_UPDATE',
      isRead: false,
      userId: lawyer1.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Upcoming Hearing',
      message: 'Court hearing scheduled for March 20, 2024',
      type: 'HEARING_REMINDER',
      isRead: false,
      userId: client1.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Document Uploaded',
      message: 'New document uploaded to your case CASE-2024-002',
      type: 'DOCUMENT_UPLOAD',
      isRead: false,
      userId: client2.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Bill Due Soon',
      message: 'Payment due for consultation services',
      type: 'BILLING',
      isRead: false,
      userId: client3.id,
    },
  });

  // Create User Settings for all users
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        currency: 'INR',
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        caseUpdates: true,
        billingAlerts: true,
        calendarReminders: true,
        profileVisibility: 'public',
        dataSharing: true,
        twoFactorAuth: false,
        language: 'en',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        theme: 'system',
      },
    });
  }

  console.log('✅ Database seeding completed!');
  console.log('📊 Created:');
  console.log(`  - ${await prisma.user.count()} users`);
  console.log(`  - ${await prisma.userSettings.count()} user settings`);
  console.log(`  - ${await prisma.legalCase.count()} cases`);
  console.log(`  - ${await prisma.legalDocument.count()} documents`);
  console.log(`  - ${await prisma.billingRecord.count()} billing records`);
  console.log(`  - ${await prisma.calendarEvent.count()} calendar events`);
  console.log(`  - ${await prisma.task.count()} tasks`);
  console.log(`  - ${await prisma.notification.count()} notifications`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
