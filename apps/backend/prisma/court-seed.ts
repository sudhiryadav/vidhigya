import { CourtType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Starting court database seeding...');

  // Supreme Court of India
  await prisma.court.upsert({
    where: { name: 'Supreme Court of India' },
    update: {},
    create: {
      name: 'Supreme Court of India',
      type: CourtType.SUPREME_COURT,
      address: 'Tilak Marg, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pincode: '110001',
      phone: '+91-11-23388942',
      email: 'supremecourt@nic.in',
      website: 'https://main.sci.gov.in',
      jurisdiction: 'Entire India',
      isActive: true,
    },
  });

  // High Courts
  const highCourts = [
    {
      name: 'Delhi High Court',
      address: 'Sher Shah Road, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110003',
      phone: '+91-11-23384444',
      email: 'delhihc@nic.in',
      website: 'https://delhihighcourt.nic.in',
      jurisdiction: 'Delhi',
    },
    {
      name: 'Bombay High Court',
      address: 'Fort, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400032',
      phone: '+91-22-22621854',
      email: 'bombayhc@nic.in',
      website: 'https://bombayhighcourt.nic.in',
      jurisdiction: 'Maharashtra, Goa, Dadra and Nagar Haveli, Daman and Diu',
    },
    {
      name: 'Calcutta High Court',
      address: 'Esplanade Row West, Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001',
      phone: '+91-33-22486300',
      email: 'calcutta.hc@nic.in',
      website: 'https://calcuttahighcourt.gov.in',
      jurisdiction: 'West Bengal, Andaman and Nicobar Islands',
    },
    {
      name: 'Madras High Court',
      address: "Parry's Corner, Chennai",
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600104',
      phone: '+91-44-25341500',
      email: 'madras.hc@nic.in',
      website: 'https://www.hcmadras.tn.nic.in',
      jurisdiction: 'Tamil Nadu, Puducherry',
    },
    {
      name: 'Karnataka High Court',
      address: 'High Court Building, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91-80-22951111',
      email: 'karnataka.hc@nic.in',
      website: 'https://karnatakajudiciary.kar.nic.in',
      jurisdiction: 'Karnataka',
    },
    {
      name: 'Kerala High Court',
      address: 'High Court Junction, Ernakulam',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682031',
      phone: '+91-484-2562235',
      email: 'kerala.hc@nic.in',
      website: 'https://highcourtchd.gov.in',
      jurisdiction: 'Kerala, Lakshadweep',
    },
    {
      name: 'Gujarat High Court',
      address: 'Sola, Ahmedabad',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380060',
      phone: '+91-79-23239400',
      email: 'gujarat.hc@nic.in',
      website: 'https://gujarathighcourt.nic.in',
      jurisdiction: 'Gujarat',
    },
    {
      name: 'Rajasthan High Court',
      address: 'Jodhpur',
      city: 'Jodhpur',
      state: 'Rajasthan',
      pincode: '342001',
      phone: '+91-291-2644444',
      email: 'rajasthan.hc@nic.in',
      website: 'https://hcraj.nic.in',
      jurisdiction: 'Rajasthan',
    },
    {
      name: 'Punjab and Haryana High Court',
      address: 'Sector 1, Chandigarh',
      city: 'Chandigarh',
      state: 'Punjab',
      pincode: '160001',
      phone: '+91-172-2740001',
      email: 'phhc@nic.in',
      website: 'https://highcourtchd.gov.in',
      jurisdiction: 'Punjab, Haryana, Chandigarh',
    },
    {
      name: 'Uttar Pradesh High Court',
      address: 'Allahabad',
      city: 'Allahabad',
      state: 'Uttar Pradesh',
      pincode: '211001',
      phone: '+91-532-2440001',
      email: 'uphc@nic.in',
      website: 'https://www.allahabadhighcourt.in',
      jurisdiction: 'Uttar Pradesh',
    },
  ];

  for (const court of highCourts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.HIGH_COURT,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        email: court.email,
        website: court.website,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  // Major District Courts
  const districtCourts = [
    {
      name: 'Tis Hazari District Court',
      address: 'Tis Hazari, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110054',
      phone: '+91-11-23914444',
      jurisdiction: 'North Delhi',
    },
    {
      name: 'Karkardooma District Court',
      address: 'Karkardooma, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110092',
      phone: '+91-11-22370000',
      jurisdiction: 'East Delhi',
    },
    {
      name: 'Saket District Court',
      address: 'Saket, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110017',
      phone: '+91-11-29562000',
      jurisdiction: 'South Delhi',
    },
    {
      name: 'Dwarka District Court',
      address: 'Dwarka, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110075',
      phone: '+91-11-28032000',
      jurisdiction: 'South West Delhi',
    },
    {
      name: 'Rohini District Court',
      address: 'Rohini, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110085',
      phone: '+91-11-27572000',
      jurisdiction: 'North West Delhi',
    },
    {
      name: 'City Civil and Sessions Court, Mumbai',
      address: 'Fort, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-22-22621854',
      jurisdiction: 'Mumbai City',
    },
    {
      name: 'City Civil and Sessions Court, Bangalore',
      address: 'City Civil Court Complex, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91-80-22951111',
      jurisdiction: 'Bangalore Urban',
    },
    {
      name: 'City Civil Court, Chennai',
      address: "Parry's Corner, Chennai",
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600104',
      phone: '+91-44-25341500',
      jurisdiction: 'Chennai',
    },
    {
      name: 'City Civil Court, Kolkata',
      address: 'Esplanade Row West, Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700001',
      phone: '+91-33-22486300',
      jurisdiction: 'Kolkata',
    },
    {
      name: 'City Civil Court, Hyderabad',
      address: 'Nampally, Hyderabad',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      phone: '+91-40-24611111',
      jurisdiction: 'Hyderabad',
    },
  ];

  for (const court of districtCourts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.DISTRICT_COURT,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  // Family Courts
  const familyCourts = [
    {
      name: 'Family Court, Delhi',
      address: 'Karkardooma, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110092',
      phone: '+91-11-22370000',
      jurisdiction: 'Delhi',
    },
    {
      name: 'Family Court, Mumbai',
      address: 'Fort, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-22-22621854',
      jurisdiction: 'Mumbai',
    },
    {
      name: 'Family Court, Bangalore',
      address: 'City Civil Court Complex, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      phone: '+91-80-22951111',
      jurisdiction: 'Bangalore',
    },
  ];

  for (const court of familyCourts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.FAMILY_COURT,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  // Consumer Courts
  const consumerCourts = [
    {
      name: 'National Consumer Disputes Redressal Commission',
      address: 'Janpath Bhawan, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '+91-11-23388444',
      email: 'ncdrc@nic.in',
      website: 'https://ncdrc.nic.in',
      jurisdiction: 'Entire India',
    },
    {
      name: 'Delhi State Consumer Disputes Redressal Commission',
      address: 'Karkardooma, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110092',
      phone: '+91-11-22370000',
      jurisdiction: 'Delhi',
    },
    {
      name: 'Maharashtra State Consumer Disputes Redressal Commission',
      address: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-22-22621854',
      jurisdiction: 'Maharashtra',
    },
  ];

  for (const court of consumerCourts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.CONSUMER_COURT,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        email: court.email,
        website: court.website,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  // Labor Courts
  const laborCourts = [
    {
      name: 'Central Government Industrial Tribunal',
      address: 'New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '+91-11-23388444',
      jurisdiction: 'Central Government Employees',
    },
    {
      name: 'Delhi Labor Court',
      address: 'Karkardooma, Delhi',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110092',
      phone: '+91-11-22370000',
      jurisdiction: 'Delhi',
    },
    {
      name: 'Maharashtra Labor Court',
      address: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '+91-22-22621854',
      jurisdiction: 'Maharashtra',
    },
  ];

  for (const court of laborCourts) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.LABOR_COURT,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  // Tribunals
  const tribunals = [
    {
      name: 'National Company Law Tribunal',
      address: 'New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '+91-11-23388444',
      email: 'nclt@nic.in',
      website: 'https://nclt.gov.in',
      jurisdiction: 'Entire India',
    },
    {
      name: 'Income Tax Appellate Tribunal',
      address: 'New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '+91-11-23388444',
      email: 'itat@nic.in',
      website: 'https://itat.gov.in',
      jurisdiction: 'Entire India',
    },
    {
      name: 'Customs, Excise and Service Tax Appellate Tribunal',
      address: 'New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '+91-11-23388444',
      email: 'cestat@nic.in',
      website: 'https://cestat.gov.in',
      jurisdiction: 'Entire India',
    },
  ];

  for (const court of tribunals) {
    await prisma.court.upsert({
      where: { name: court.name },
      update: {},
      create: {
        name: court.name,
        type: CourtType.TRIBUNAL,
        address: court.address,
        city: court.city,
        state: court.state,
        country: 'India',
        pincode: court.pincode,
        phone: court.phone,
        email: court.email,
        website: court.website,
        jurisdiction: court.jurisdiction,
        isActive: true,
      },
    });
  }

  console.log('✅ Court database seeding completed!');
  console.log('📊 Created:');
  console.log(`  - ${await prisma.court.count()} courts`);

  // Log court types distribution
  const courtTypes = await prisma.court.groupBy({
    by: ['type'],
    _count: {
      type: true,
    },
  });

  console.log('🏛️ Court types distribution:');
  courtTypes.forEach(({ type, _count }) => {
    console.log(`  - ${type}: ${_count.type} courts`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error during court seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
