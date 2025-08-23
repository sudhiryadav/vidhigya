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
      phone: '+91 98765-43210',
      isActive: true,
    },
  });

  console.log('✅ Created Super Admin:', superAdmin.name);

  // Create Sample Law Firm Practice
  const lawFirmPractice = await prisma.practice.create({
    data: {
      name: 'Johnson & Associates Law Firm',
      practiceType: 'FIRM',
      description:
        'A premier law firm specializing in corporate law, litigation, and intellectual property',
      isActive: true,
      firm: {
        create: {
          registrationNumber: 'F-2024-001',
          address: '123 Corporate Plaza, Business District',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400001',
          phone: '+91 22-1234-5678',
          email: 'info@johnsonlaw.com',
          website: 'www.johnsonlaw.com',
          taxId: 'TAX-2024-001',
        },
      },
    },
  });

  console.log('✅ Created Law Firm Practice:', lawFirmPractice.name);

  // Create Super Admin Practice Member (access to law firm practice)
  const superAdminMember = await prisma.practiceMember.create({
    data: {
      practiceId: lawFirmPractice.id,
      userId: superAdmin.id,
      role: 'OWNER', // Super admin gets owner access
      isActive: true,
    },
  });

  // Update super admin with primaryPracticeId
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { primaryPracticeId: superAdminMember.id },
  });

  // Create Firm Owner/Admin
  const firmOwnerPassword = await bcrypt.hash('firm123', 10);
  const firmOwner = await prisma.user.upsert({
    where: { email: 'johnson@johnsonlaw.com' },
    update: {},
    create: {
      email: 'johnson@johnsonlaw.com',
      password: firmOwnerPassword,
      name: 'Robert Johnson',
      role: 'LAWYER',
      phone: '+91 98765-43211',
      isActive: true,
    },
  });

  // Create Practice Member for Firm Owner (OWNER role)
  const firmOwnerMember = await prisma.practiceMember.create({
    data: {
      practiceId: lawFirmPractice.id,
      userId: firmOwner.id,
      role: 'OWNER',
      isActive: true,
    },
  });

  // Update user with primaryPracticeId
  await prisma.user.update({
    where: { id: firmOwner.id },
    data: { primaryPracticeId: firmOwnerMember.id },
  });

  console.log('✅ Created Firm Owner:', firmOwner.name);

  // Create Firm Partner
  const firmPartnerPassword = await bcrypt.hash('partner123', 10);
  const firmPartner = await prisma.user.upsert({
    where: { email: 'patel@johnsonlaw.com' },
    update: {},
    create: {
      email: 'patel@johnsonlaw.com',
      password: firmPartnerPassword,
      name: 'Priya Patel',
      role: 'LAWYER',
      phone: '+91 98765-43212',
      isActive: true,
    },
  });

  // Create Practice Member for Firm Partner
  const firmPartnerMember = await prisma.practiceMember.create({
    data: {
      practiceId: lawFirmPractice.id,
      userId: firmPartner.id,
      role: 'PARTNER',
      isActive: true,
    },
  });

  // Update user with primaryPracticeId
  await prisma.user.update({
    where: { id: firmPartner.id },
    data: { primaryPracticeId: firmPartnerMember.id },
  });

  console.log('✅ Created Firm Partner:', firmPartner.name);

  // Create Firm Associate
  const firmAssociatePassword = await bcrypt.hash('associate123', 10);
  const firmAssociate = await prisma.user.upsert({
    where: { email: 'kumar@johnsonlaw.com' },
    update: {},
    create: {
      email: 'kumar@johnsonlaw.com',
      password: firmAssociatePassword,
      name: 'Arun Kumar',
      role: 'ASSOCIATE',
      phone: '+91 98765-43213',
      isActive: true,
    },
  });

  // Create Practice Member for Firm Associate
  const firmAssociateMember = await prisma.practiceMember.create({
    data: {
      practiceId: lawFirmPractice.id,
      userId: firmAssociate.id,
      role: 'ASSOCIATE',
      isActive: true,
    },
  });

  // Update user with primaryPracticeId
  await prisma.user.update({
    where: { id: firmAssociate.id },
    data: { primaryPracticeId: firmAssociateMember.id },
  });

  console.log('✅ Created Firm Associate:', firmAssociate.name);

  // Create Firm Paralegal
  const firmParalegalPassword = await bcrypt.hash('paralegal123', 10);
  const firmParalegal = await prisma.user.upsert({
    where: { email: 'sharma@johnsonlaw.com' },
    update: {},
    create: {
      email: 'sharma@johnsonlaw.com',
      password: firmParalegalPassword,
      name: 'Neha Sharma',
      role: 'PARALEGAL',
      phone: '+91 98765-43214',
      isActive: true,
    },
  });

  // Create Practice Member for Firm Paralegal
  const firmParalegalMember = await prisma.practiceMember.create({
    data: {
      practiceId: lawFirmPractice.id,
      userId: firmParalegal.id,
      role: 'PARALEGAL',
      isActive: true,
    },
  });

  // Update user with primaryPracticeId
  await prisma.user.update({
    where: { id: firmParalegal.id },
    data: { primaryPracticeId: firmParalegalMember.id },
  });

  console.log('✅ Created Firm Paralegal:', firmParalegal.name);

  // Create Individual Lawyer Practice
  const individualPractice = await prisma.practice.create({
    data: {
      name: 'Sarah Wilson Law Office',
      practiceType: 'INDIVIDUAL',
      description:
        'Individual practice specializing in family law and estate planning',
      isActive: true,
    },
  });

  console.log('✅ Created Individual Practice:', individualPractice.name);

  // Create Individual Lawyer
  const individualLawyerPassword = await bcrypt.hash('individual123', 10);
  const individualLawyer = await prisma.user.upsert({
    where: { email: 'sarah@wilsonlaw.com' },
    update: {},
    create: {
      email: 'sarah@wilsonlaw.com',
      password: individualLawyerPassword,
      name: 'Sarah Wilson',
      role: 'LAWYER',
      phone: '+91 98765-43215',
      isActive: true,
    },
  });

  // Create Practice Member for Individual Lawyer (OWNER role)
  const individualLawyerMember = await prisma.practiceMember.create({
    data: {
      practiceId: individualPractice.id,
      userId: individualLawyer.id,
      role: 'OWNER',
      isActive: true,
    },
  });

  // Update user with primaryPracticeId
  await prisma.user.update({
    where: { id: individualLawyer.id },
    data: { primaryPracticeId: individualLawyerMember.id },
  });

  console.log('✅ Created Individual Lawyer:', individualLawyer.name);

  // Create Sample Clients for Law Firm
  const client1 = await prisma.client.create({
    data: {
      name: 'TechCorp Solutions',
      email: 'legal@techcorp.com',
      phone: '+91 98765-43216',
      address: '456 Tech Park, Innovation District, Mumbai, Maharashtra, India',
      practiceId: lawFirmPractice.id,
      isActive: true,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Global Manufacturing Ltd',
      email: 'legal@globalmfg.com',
      phone: '+91 98765-43217',
      address:
        '789 Industrial Zone, Manufacturing District, Mumbai, Maharashtra, India',
      practiceId: lawFirmPractice.id,
      isActive: true,
    },
  });

  console.log('✅ Created Firm Clients:', client1.name, 'and', client2.name);

  // Create Sample Client for Individual Practice
  const individualClient = await prisma.client.create({
    data: {
      name: 'Family Trust Estate',
      email: 'trust@familyestate.com',
      phone: '+91 98765-43218',
      address:
        '321 Heritage Lane, Residential Area, Mumbai, Maharashtra, India',
      practiceId: individualPractice.id,
      isActive: true,
    },
  });

  console.log('✅ Created Individual Practice Client:', individualClient.name);

  // Create User Settings for all users
  const users = [
    superAdmin,
    firmOwner,
    firmPartner,
    firmAssociate,
    firmParalegal,
    individualLawyer,
  ];

  for (const user of users) {
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        practiceId: user.primaryPracticeId || lawFirmPractice.id,
        currency: 'INR',
        fontSize: 'md',
        emailNotifications: true,
        pushNotifications: true,
      },
    });
  }

  console.log('✅ Created User Settings for all users');

  // Create Sample Cases
  const firmCase = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-001',
      title: 'TechCorp vs Competitor - Patent Infringement',
      description: 'Patent infringement case involving software technology',
      category: 'INTELLECTUAL_PROPERTY',
      priority: 'HIGH',
      status: 'OPEN',
      clientId: client1.id,
      assignedLawyerId: firmOwner.id,
      practiceId: lawFirmPractice.id,
    },
  });

  const individualCase = await prisma.legalCase.create({
    data: {
      caseNumber: 'CASE-2024-002',
      title: 'Family Trust Estate Planning',
      description: 'Comprehensive estate planning for family trust',
      category: 'PROPERTY',
      priority: 'MEDIUM',
      status: 'OPEN',
      clientId: individualClient.id,
      assignedLawyerId: individualLawyer.id,
      practiceId: individualPractice.id,
    },
  });

  console.log('✅ Created Sample Cases');

  // Create Sample Notifications
  await prisma.notification.createMany({
    data: [
      {
        title: 'Welcome to Vidhigya',
        message: 'Thank you for joining our legal practice management platform',
        type: 'SYSTEM',
        userId: superAdmin.id,
        practiceId: lawFirmPractice.id,
        isRead: false,
      },
      {
        title: 'New Case Assigned',
        message: 'You have been assigned to TechCorp vs Competitor case',
        type: 'CASE_UPDATE',
        userId: firmOwner.id,
        practiceId: lawFirmPractice.id,
        isRead: false,
      },
      {
        title: 'Document Uploaded',
        message: 'New document uploaded for Family Trust Estate case',
        type: 'DOCUMENT_UPLOAD',
        userId: individualLawyer.id,
        practiceId: individualPractice.id,
        isRead: false,
      },
    ],
  });

  console.log('✅ Created Sample Notifications');

  // Create Sample Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Review TechCorp Patent Case',
        description: 'Analyze patent documentation and prepare initial assessment',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        caseId: firmCase.id,
        createdById: firmOwner.id,
        assignedToId: firmPartner.id,
        practiceId: lawFirmPractice.id,
      },
      {
        title: 'Prepare Estate Planning Documents',
        description: 'Draft comprehensive estate planning documents for Family Trust',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        caseId: individualCase.id,
        createdById: individualLawyer.id,
        assignedToId: individualLawyer.id,
        practiceId: individualPractice.id,
      },
      {
        title: 'Client Meeting Preparation',
        description: 'Prepare agenda and materials for TechCorp quarterly review',
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        clientId: client1.id,
        createdById: firmOwner.id,
        assignedToId: firmAssociate.id,
        practiceId: lawFirmPractice.id,
      },
    ],
  });

  console.log('✅ Created Sample Tasks');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Super Admin: admin@vidhigya.com / admin123');
  console.log('Firm Owner: johnson@johnsonlaw.com / firm123');
  console.log('Firm Partner: patel@johnsonlaw.com / partner123');
  console.log('Firm Associate: kumar@johnsonlaw.com / associate123');
  console.log('Firm Paralegal: sharma@johnsonlaw.com / paralegal123');
  console.log('Individual Lawyer: sarah@wilsonlaw.com / individual123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
