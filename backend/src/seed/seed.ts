import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Grievance } from '../models/Grievance';
import { Solution } from '../models/Solution';
import { Vouch } from '../models/Vouch';
import { Comment } from '../models/Comment';
import { ProjectBlueprint } from '../models/ProjectBlueprint';
import { connectDB } from '../config/db';
import { computeUrgencyScore } from '../services/scoringService';
import { getInfrastructureGap } from '../services/dataFusionService';
import { generateEmbedding } from '../services/geminiService';

async function seed() {
  console.log('Starting CivicForge database seeding process...');
  
  // Connect to DB (real Mongo or local fallback)
  await connectDB();

  try {
    // 1. Clear Existing Collections
    console.log('Clearing existing data from collections...');
    await User.deleteMany({});
    await Grievance.deleteMany({});
    await Solution.deleteMany({});
    await Vouch.deleteMany({});
    await Comment.deleteMany({});
    await ProjectBlueprint.deleteMany({});

    // 2. Hash default password
    const hashedPassword = await bcrypt.hash('123456', 10);

    // 3. Seed Users
    console.log('Seeding MP, Citizen, and Civic Engineer users...');
    
    // MP User
    const mpUser = await User.create({
      name: 'Hon. Amit Roy, MP',
      email: 'mp@civicforge.in',
      password: hashedPassword,
      role: 'mp',
      phone: '+91 98300 12345',
      region: 'Kolkata South'
    });

    // 5 Citizens
    const citizens = [];
    const citizenNames = [
      'Vikram Chatterjee',
      'Priya Sen',
      'Rajesh Mukherjee',
      'Anjali Das',
      'Subir Bose'
    ];
    for (let i = 0; i < 5; i++) {
      const citizen = await User.create({
        name: citizenNames[i],
        email: `citizen${i+1}@gmail.com`,
        password: hashedPassword,
        role: 'citizen',
        phone: `+91 98301 1110${i}`,
        region: i % 2 === 0 ? 'Behala' : 'Salt Lake'
      });
      citizens.push(citizen);
    }

    // 5 Civic Engineers
    const developers = [];
    const devNames = [
      'TechForge Labs (Arijit)',
      'CivicDev Solutions (Neha)',
      'Kolkata Code Brigade',
      'Sayan Bandyopadhyay',
      'DevOps Pioneer'
    ];
    for (let i = 0; i < 5; i++) {
      const dev = await User.create({
        name: devNames[i],
        email: `dev${i+1}@gmail.com`,
        password: hashedPassword,
        role: 'developer',
        phone: `+91 98302 2220${i}`,
        region: 'Kolkata'
      });
      developers.push(dev);
    }

    // 4. Seed Grievances (15-20 across 3 categories & 3 regions)
    console.log('Seeding 16 community grievances...');
    
    // Grievance specs
    const grievanceSpecs = [
      // Category: water
      {
        citizenIdx: 0,
        category: 'water',
        description: 'Severe waterlogging and clogged drainage system causing sewage overflow on Sector V main road.',
        inputType: 'text',
        lat: 22.5726,
        lng: 88.4339,
        address: 'Sector V, Salt Lake City, Kolkata, WB',
        stressScore: 75
      },
      {
        citizenIdx: 1,
        category: 'water',
        description: 'Drinking water pipeline leakage has contaminated municipal water supply with dirt and foul odor.',
        inputType: 'voice',
        lat: 22.5710,
        lng: 88.4320,
        address: 'BJ Block, Sector II, Salt Lake, Kolkata, WB',
        stressScore: 82
      },
      {
        citizenIdx: 2,
        category: 'water',
        description: 'Completely dried up municipal tube wells in Behala region. Locals have to travel 2km for clean water.',
        inputType: 'text',
        lat: 22.4981,
        lng: 88.3184,
        address: 'Diamond Harbour Road, Behala, Kolkata, WB',
        stressScore: 90
      },
      {
        citizenIdx: 3,
        category: 'water',
        description: 'Water pressure in municipal pipes is extremely low; barely runs for 10 minutes in the morning.',
        inputType: 'text',
        lat: 22.4965,
        lng: 88.3195,
        address: 'Parnasree Pally, Behala, Kolkata, WB',
        stressScore: 50
      },
      {
        citizenIdx: 4,
        category: 'water',
        description: 'Muddy tap water running in ward 82 for the last five days. Health issues rising among children.',
        inputType: 'text',
        lat: 22.4990,
        lng: 88.3150,
        address: 'Roy Bahadur Road, Behala, Kolkata, WB',
        stressScore: 85
      },
      // Category: road
      {
        citizenIdx: 0,
        category: 'road',
        description: 'Giant potholes near Garia station causing massive traffic gridlocks and minor accidents daily.',
        inputType: 'photo',
        lat: 22.4714,
        lng: 88.3768,
        address: 'Garia Station Road, Kolkata, WB',
        stressScore: 78
      },
      {
        citizenIdx: 1,
        category: 'road',
        description: 'The connector road is completely unpaved. Thick clouds of dust are causing respiratory issues for locals.',
        inputType: 'text',
        lat: 22.4730,
        lng: 88.3740,
        address: 'Briji Road, Garia, Kolkata, WB',
        stressScore: 68
      },
      {
        citizenIdx: 2,
        category: 'road',
        description: 'Broken manhole cover right in the middle of Park Street. High hazard for heavy evening traffic.',
        inputType: 'photo',
        lat: 22.5530,
        lng: 88.3510,
        address: 'Park Street Crossings, Chowringhee, Kolkata, WB',
        stressScore: 92
      },
      {
        citizenIdx: 3,
        category: 'road',
        description: 'Street light posts are rusted and falling down, making pedestrian pavements unusable.',
        inputType: 'text',
        lat: 22.5515,
        lng: 88.3505,
        address: 'Camac Street, Chowringhee, Kolkata, WB',
        stressScore: 60
      },
      {
        citizenIdx: 4,
        category: 'road',
        description: 'No zebra crossings or pedestrian lights outside school. Cars speed at 80km/h; dangerous for students.',
        inputType: 'text',
        lat: 22.5545,
        lng: 88.3530,
        address: 'Outram Road, Park Street area, Kolkata, WB',
        stressScore: 88
      },
      // Category: electricity
      {
        citizenIdx: 0,
        category: 'electricity',
        description: 'High voltage fluctuations in Salt Lake BJ Block blowing up household electronics and appliances.',
        inputType: 'text',
        lat: 22.5740,
        lng: 88.4350,
        address: 'BJ Block Market, Salt Lake, Kolkata, WB',
        stressScore: 70
      },
      {
        citizenIdx: 1,
        category: 'electricity',
        description: 'Dangerous loose high-tension power cables hanging low from a tree branch near the children playground.',
        inputType: 'photo',
        lat: 22.5700,
        lng: 88.4310,
        address: 'Sector I Park, Salt Lake, Kolkata, WB',
        stressScore: 95
      },
      {
        citizenIdx: 2,
        category: 'electricity',
        description: 'Daily power cuts for 4-5 hours in Garia area during extreme summer. Inoperable ventilators in local clinic.',
        inputType: 'text',
        lat: 22.4700,
        lng: 88.3790,
        address: 'Kanungo Park, Garia, Kolkata, WB',
        stressScore: 88
      },
      {
        citizenIdx: 3,
        category: 'electricity',
        description: 'Streetlights have been out of service for two weeks. Anti-social activities rising in dark alleys.',
        inputType: 'text',
        lat: 22.4725,
        lng: 88.3755,
        address: 'Nabadiganta Road, Garia, Kolkata, WB',
        stressScore: 65
      },
      // Category: sanitation
      {
        citizenIdx: 4,
        category: 'sanitation',
        description: 'Huge garbage heap left on the main road for over 10 days near Behala market. Awful smell and mosquito breeding.',
        inputType: 'photo',
        lat: 22.4975,
        lng: 88.3160,
        address: 'Behala Tram Depot Market, Kolkata, WB',
        stressScore: 80
      },
      {
        citizenIdx: 0,
        category: 'sanitation',
        description: 'Open sewer lines running through residential areas. Overflowing during light rains, flooding homes.',
        inputType: 'text',
        lat: 22.4950,
        lng: 88.3130,
        address: 'Sarsuna Satellite Township, Behala, Kolkata, WB',
        stressScore: 87
      }
    ];

    const seededGrievances = [];
    
    // We first seed the base grievances to compute proper spatial recurrence count
    for (const spec of grievanceSpecs) {
      // Calculate gap score
      const { gapScore } = getInfrastructureGap(spec.lat, spec.lng, spec.category);

      // Semantic embedding (Gemini) for Atlas Vector Search, null if no API key.
      const embedding = await generateEmbedding(spec.description);

      const g = await Grievance.create({
        citizen: citizens[spec.citizenIdx]._id,
        category: spec.category,
        description: spec.description,
        inputType: spec.inputType,
        location: { lat: spec.lat, lng: spec.lng, address: spec.address },
        // GeoJSON mirror for Atlas 2dsphere queries ([lng, lat] order)
        geoLocation: { type: 'Point', coordinates: [spec.lng, spec.lat] },
        embedding: embedding || undefined,
        stressScore: spec.stressScore,
        infrastructureGapScore: gapScore,
        recurrenceCount: 1, // temporary
        urgencyScore: 50, // temporary
        status: 'pending_review'
      });
      seededGrievances.push(g);
    }

    // Now, let's run cluster recalculations for all categories to update recurrenceCount and composite urgencyScore properly!
    console.log('Calculating geographic cluster sizes and compound urgency scores...');
    
    // Update water cluster in Salt Lake (spec.lat: 22.5726)
    const waterSaltLakeCount = seededGrievances.filter(g => g.category === 'water' && g.location.lat > 22.55).length;
    // Update water cluster in Behala (spec.lat: 22.4981)
    const waterBehalaCount = seededGrievances.filter(g => g.category === 'water' && g.location.lat < 22.51).length;
    // Update road cluster in Park Street
    const roadParkStreetCount = seededGrievances.filter(g => g.category === 'road' && g.location.lat > 22.52).length;
    // Update road cluster in Garia
    const roadGariaCount = seededGrievances.filter(g => g.category === 'road' && g.location.lat < 22.49).length;
    // Update electricity cluster in Salt Lake
    const electricitySaltLakeCount = seededGrievances.filter(g => g.category === 'electricity' && g.location.lat > 22.52).length;
    // Update electricity cluster in Garia
    const electricityGariaCount = seededGrievances.filter(g => g.category === 'electricity' && g.location.lat < 22.49).length;
    // Update sanitation cluster in Behala
    const sanitationBehalaCount = seededGrievances.filter(g => g.category === 'sanitation').length;

    // Apply updated recurrence counts and final urgency scores
    for (const g of seededGrievances) {
      let rCount = 1;
      if (g.category === 'water') {
        rCount = g.location.lat > 22.55 ? waterSaltLakeCount : waterBehalaCount;
      } else if (g.category === 'road') {
        rCount = g.location.lat > 22.52 ? roadParkStreetCount : roadGariaCount;
      } else if (g.category === 'electricity') {
        rCount = g.location.lat > 22.52 ? electricitySaltLakeCount : electricityGariaCount;
      } else if (g.category === 'sanitation') {
        rCount = sanitationBehalaCount;
      }

      const stress = g.stressScore;
      const gap = g.infrastructureGapScore;
      const finalUrgency = computeUrgencyScore(rCount, stress, gap);

      await Grievance.findByIdAndUpdate(g._id, {
        recurrenceCount: rCount,
        urgencyScore: finalUrgency,
        status: finalUrgency > 75 ? 'verified' : 'pending_review' // Autoverify extremely urgent issues!
      });
    }

    // Re-fetch all grievances to get updated objects for blueprint references
    const updatedGrievanceList = await Grievance.find({});

    // 5. Seed Civic Engineer Solutions (7 solutions across water, road, electricity, sanitation)
    console.log('Seeding 7 civic engineer prototypes / solutions...');
    const solutions = [
      {
        devIdx: 0,
        title: 'AquaSensor IoT: Pipe Leak Detection Network',
        solutionType: 'hybrid',
        description: 'Low-cost acoustic and flow rate IoT hardware clamps that attach to municipal water distribution pipelines. Uses Edge AI to detect pinpoint pressure drops and leak vibration patterns before pavement collapses occur.',
        techStack: ['Node.js', 'React', 'C++', 'MQTT', 'TensorFlow Lite'],
        targetCategory: 'water',
        repoUrl: 'https://github.com/techforge/aquasensor-iot',
        demoUrl: 'https://aquasensor.demo.civicforge.in',
        vouchCount: 14
      },
      {
        devIdx: 1,
        title: 'RoadScan AI: Autonomous Pavement Defect Mapper',
        solutionType: 'software',
        description: 'A mobile application utilizing computer vision that dash-mounts in municipal buses or garbage trucks. Automatically video-scans city streets, classifies potholes, fissures, and crumbling edges with GPS stamps, and exports a GIS maintenance map.',
        techStack: ['Python', 'React Native', 'YOLOv8', 'PostgreSQL', 'FastAPI'],
        targetCategory: 'road',
        repoUrl: 'https://github.com/neha/roadscan-ai',
        demoUrl: 'https://roadscan.vercel.app',
        vouchCount: 22,
        status: 'deployed'
      },
      {
        devIdx: 2,
        title: 'EcoSort Smart Grid: Civic Waste Router',
        solutionType: 'hybrid',
        description: 'A logistics optimization platform connecting community rubbish bins to public garbage trucks. Uses acoustic fill-level ultrasonic sensors to alert garbage management services of filled bins, optimizing diesel truck paths and avoiding street litter.',
        techStack: ['React', 'Express', 'D3.js', 'Tailwind CSS', 'Leaflet'],
        targetCategory: 'sanitation',
        repoUrl: 'https://github.com/codebrigade/ecosort-grid',
        demoUrl: 'https://ecosort.demo.in',
        vouchCount: 9
      },
      {
        devIdx: 3,
        title: 'GridPulse: Smart Grid Local Voltage Balancer',
        solutionType: 'software',
        description: 'An open-source telemetry dashboard compiling consumer smart-meter voltage records. Isolates high-tension transformers that are over-loaded, allowing electricity boards to preemptively balance phase voltages and prevent local blackouts.',
        techStack: ['TypeScript', 'React', 'InfluxDB', 'Grafana', 'Go'],
        targetCategory: 'electricity',
        repoUrl: 'https://github.com/sayan/gridpulse-telemetry',
        demoUrl: 'https://gridpulse.org',
        vouchCount: 18
      },
      {
        devIdx: 4,
        title: 'HydroAlert: Early Warning Drainage Flow Meter',
        solutionType: 'hardware',
        description: 'Submersible water level and flow speed indicators designed for municipal storm drains. Alerts local administration immediately when drainage speeds fall below thresholds, identifying blockages and preventing heavy waterlogging.',
        techStack: ['Arduino', 'React', 'Tailwind', 'Node-RED'],
        targetCategory: 'water',
        repoUrl: 'https://github.com/devops/hydroalert-meter',
        vouchCount: 6
      },
      {
        devIdx: 1,
        title: 'LightGuard: Photocell Power Theft Detector',
        solutionType: 'hybrid',
        description: 'Retrofit mesh controllers for solar street lights that detect line-tapping power thefts and wire shortages. Instantly flags inactive street lights on a live administrative dashboard, reducing crime-vulnerable dark zones.',
        techStack: ['React', 'Express', 'Mongoose', 'Leaflet.js'],
        targetCategory: 'electricity',
        repoUrl: 'https://github.com/neha/lightguard-theft',
        vouchCount: 11
      },
      {
        devIdx: 2,
        title: 'SafeCrossing: Smart Radar Pedestrian Warning Systems',
        solutionType: 'hardware',
        description: 'A Doppler-radar and smart LED display system that alerts fast-approaching vehicles when pedestrians or students step near school crosswalks. Tracks crossing usage statistics and speed averages, reporting traffic behavior to the municipal planners.',
        techStack: ['React', 'Raspberry Pi', 'Python', 'OpenCV'],
        targetCategory: 'road',
        vouchCount: 15
      }
    ];

    const seededSolutions = [];
    for (const spec of solutions) {
      const s = await Solution.create({
        developer: developers[spec.devIdx]._id,
        title: spec.title,
        description: spec.description,
        techStack: spec.techStack || ['React', 'Express'],
        solutionType: spec.solutionType || 'software',
        targetCategory: spec.targetCategory,
        repoUrl: spec.repoUrl || 'https://github.com/civicforge',
        demoUrl: spec.demoUrl || 'https://demo.civicforge.in',
        vouchCount: spec.vouchCount,
        status: spec.status || 'submitted'
      });
      seededSolutions.push(s);
    }

    // 6. Seed Vouchers with varied createdAt timestamps
    console.log('Seeding varied vouches with specific timestamps...');
    const voters = [...citizens, ...developers];
    
    // Seed 8 vouches for RoadScan AI (seededSolutions[1])
    const roadScan = seededSolutions[1];
    roadScan.vouchCount = 0; // recalculate to match actual document count
    for (let i = 0; i < 8; i++) {
      const voter = voters[i % voters.length];
      const isRecent = i < 5; // 5 within last 7 days, 3 older
      const ageInDays = isRecent ? i + 1 : i + 9; // recent are 1-5 days old, older are 9-11 days old
      const createdAt = new Date(Date.now() - (ageInDays * 24 * 60 * 60 * 1000));
      
      await Vouch.create({
        solution: roadScan._id,
        user: voter._id,
        comment: `Community support vouch #${i + 1} for RoadScan!`,
        createdAt
      });
      roadScan.vouchCount += 1;
    }
    await roadScan.save();

    // Seed 5 vouches for AquaSensor IoT (seededSolutions[0])
    const aquaSensor = seededSolutions[0];
    aquaSensor.vouchCount = 0;
    for (let i = 0; i < 5; i++) {
      const voter = voters[(i + 2) % voters.length];
      const isRecent = i < 3; // 3 within last 7 days, 2 older
      const ageInDays = isRecent ? i + 2 : i + 10;
      const createdAt = new Date(Date.now() - (ageInDays * 24 * 60 * 60 * 1000));
      
      await Vouch.create({
        solution: aquaSensor._id,
        user: voter._id,
        comment: `Community support vouch #${i + 1} for AquaSensor!`,
        createdAt
      });
      aquaSensor.vouchCount += 1;
    }
    await aquaSensor.save();

    // 6.5. Seed Comments spread across solutions (15-20)
    console.log('Seeding 18 comments across solutions...');
    const commentTexts = [
      'This IoT device could save millions in water loss!',
      'Can we deploy this in Salt Lake BJ block? We have a major leak there.',
      'Excellent presentation, the tech stack is perfect.',
      'As a citizen, I would love to see this live.',
      'Is there any telemetry lag with MQTT?',
      'Brilliant idea to attach cameras to buses, saves so much workforce.',
      'Would love to collaborate on the YOLO model training!',
      'The budget seems extremely reasonable for the impact.',
      'We need this in Garia as soon as possible.',
      'Is the app offline-first? Connection in Behala can be spotty.',
      'This will prevent so many street accidents, thank you devs!',
      'I am an electrical engineer and I approve of this grid voltage balancer!',
      'Is the dashboard mobile responsive?',
      'Let us push this to the municipal corporation!',
      'How does the sensor deal with heavy monsoon flooding?',
      'The radar warning is very smart, school zones are currently death traps.',
      'Very clean code repository!',
      'This is a model example of citizen-led civic engineer innovation!'
    ];

    for (let i = 0; i < 18; i++) {
      const citizenIdx = i % citizens.length;
      const solutionIdx = i % seededSolutions.length;
      
      await Comment.create({
        solution: seededSolutions[solutionIdx]._id,
        user: citizens[citizenIdx]._id,
        text: commentTexts[i],
        createdAt: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)) // spread over last 9 days
      });

      const sol = seededSolutions[solutionIdx];
      sol.commentCount = (sol.commentCount || 0) + 1;
      await sol.save();
    }

    // 7. Seed 2 Sample Generated Project Blueprints in 'draft' status
    console.log('Seeding 2 sample constituency project blueprints...');
    
    // Waterlogging cluster (Salt Lake water complaints)
    const waterGrievanceIds = updatedGrievanceList
      .filter(g => g.category === 'water' && g.location.lat > 22.55)
      .map(g => g._id);
    const waterSolutionId = seededSolutions[4]._id; // HydroAlert Meter

    await ProjectBlueprint.create({
      mp: mpUser._id,
      grievanceCluster: waterGrievanceIds,
      matchedSolution: waterSolutionId,
      generatedTitle: 'Constituency Initiative: Bidhannagar Stormwater Drainage Flow Telemetry Network',
      generatedSummary: `### Executive Proposal Blueprint
This initiative aims to resolve severe, recurring stormwater waterlogging across Ward 39 of Salt Lake City, Kolkata.
By integrating **HydroAlert Flow Speed and Water Level Meters** into local catch basins, the municipal engineering department will gain immediate real-time telemetry of storm sewer capacities.

### Objectives
1. **Real-Time Obstruction Mapping**: Catch and clear storm pipe blockages within 30 minutes.
2. **Preventative Maintenance**: Pre-clean high-risk drainage branches before monsoon events.
3. **Public Transparency**: Inform citizens of waterlogging risks via local municipal dashboards.

### Implementation Timeline
- **Phase 1**: Deployment of 50 HydroAlert sensor nodes in the Sector V - Salt Lake bypass corridor (Months 1-2).
- **Phase 2**: Central dashboard configuration and integration with municipal sanitation teams (Month 3).`,
      estimatedBudget: '₹ 8,40,000 INR',
      generatedByAI: true,
      status: 'draft'
    });

    // Pothole cluster (Garia and Park Street road complaints)
    const roadGrievanceIds = updatedGrievanceList
      .filter(g => g.category === 'road')
      .map(g => g._id);
    const roadSolutionId = seededSolutions[1]._id; // RoadScan AI

    await ProjectBlueprint.create({
      mp: mpUser._id,
      grievanceCluster: roadGrievanceIds,
      matchedSolution: roadSolutionId,
      generatedTitle: 'Urban Mobility Initiative: Autonomous Road Infrastructure Inspection & Maintenance System',
      generatedSummary: `### Executive Proposal Blueprint
Kolkata South Constituency encompasses dense arterials suffering from high road wear, resulting in major potholes on Diamond Harbour Road, Behala, and key sections of Park Street.
This initiative deploys the **RoadScan AI Pavement Defect Mapper** on 15 municipal buses, automating street inspections through computer vision.

### Technical Architecture
- **Edge Inference**: High-definition camera feeds are analyzed in real-time by a YOLO-based computer vision model.
- **Geographic Tagging**: Defect coordinates are automatically pushed to the MP's Public Works dashboard.
- **Budget Priority Routing**: Prioritizes municipal asphalt patching trucks to highest-urgency zones.`,
      estimatedBudget: '₹ 14,50,000 INR',
      generatedByAI: true,
      status: 'draft'
    });

    console.log('Seeding completed successfully!');
    console.log('\n=====================================================================');
    console.log('                 CIVICFORGE SEED LOGIN CREDENTIALS');
    console.log('=====================================================================');
    console.log(`Role: Member of Parliament (MP)`);
    console.log(`  - Email:    mp@civicforge.in`);
    console.log(`  - Password: 123456`);
    console.log(`\nRole: Citizen (5 Users seeded)`);
    console.log(`  - Emails:   citizen1@gmail.com, citizen2@gmail.com, citizen3@gmail.com...`);
    console.log(`  - Password: 123456`);
    console.log(`\nRole: Civic Engineer (5 Users seeded)`);
    console.log(`  - Emails:   dev1@gmail.com, dev2@gmail.com, dev3@gmail.com...`);
    console.log(`  - Password: 123456`);
    console.log('=====================================================================\n');

  } catch (error) {
    console.error('An error occurred during database seeding:', error);
  } finally {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

seed();
