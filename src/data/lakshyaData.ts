import { DepartmentInfo, EventItem, ScheduleItem, CampusSpot } from '../types';

export const FEST_METRICS = {
  prizePool: '₹5,00,000+',
  eventsCount: '18 Events',
  departmentsCount: '9 Branches',
  expectedFootfall: '12,000+',
  days: '1 Day National Fest',
  edition: 'Annual National Symposium',
  collegeName: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
  location: 'Mylavaram, NTR District, Andhra Pradesh - 521230',
  accreditation: 'Approved by AICTE, Affiliated to JNTUK, NAAC A+ Grade & NBA Accredited'
};

export const DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'cse',
    name: 'Computer Science & Engineering (CSE)',
    code: 'CSE-CORE',
    theme: 'Algorithmic Systems & Software Engineering',
    description: 'Enter the algorithmic realm of high-speed coding, software architecture, data structures, and competitive problem-solving.',
    iconName: 'Terminal',
    accentColor: '#00f0ff', // Electric Cyan Blue
    badge: 'Computing Core',
    totalPrizes: '₹50,000'
  },
  {
    id: 'it',
    name: 'Information Technology (IT)',
    code: 'IT-CLOUD',
    theme: 'Cloud Architecture & Enterprise Networks',
    description: 'Full-stack cloud deployments, distributed networking, enterprise IT solutions, and automated DevOps infrastructure.',
    iconName: 'Server',
    accentColor: '#06b6d4', // Bright Cyan
    badge: 'Cloud Vanguard',
    totalPrizes: '₹50,000'
  },
  {
    id: 'aids',
    name: 'Artificial Intelligence & Data Science (AI&DS)',
    code: 'AIDS-DATA',
    theme: 'Big Data Analytics & Statistical Intelligence',
    description: 'Predictive data modeling, automated analytics pipelines, big data mining, and statistical data visualization.',
    iconName: 'Database',
    accentColor: '#3b82f6', // Sapphire Blue
    badge: 'Data Intelligence',
    totalPrizes: '₹50,000'
  },
  {
    id: 'aiml',
    name: 'Artificial Intelligence & Machine Learning (AI&ML)',
    code: 'AIML-NEURAL',
    theme: 'Neural Architectures & Cognitive Systems',
    description: 'Deep neural networks, generative AI sprint, autonomous LLM agents, and real-time computer vision challenges.',
    iconName: 'Brain',
    accentColor: '#c084fc', // Violet Purple
    badge: 'AI Vanguard',
    totalPrizes: '₹50,000'
  },
  {
    id: 'ece',
    name: 'Electronics & Communication Engineering',
    code: 'ECE-SYNAPSE',
    theme: 'Silicon & Autonomous Robotics',
    description: 'Design the nervous system of modern robotics, circuit debugging, embedded systems, and arena bot warfare.',
    iconName: 'Cpu',
    accentColor: '#ec4899', // Neon Pink
    badge: 'Robo Arena',
    totalPrizes: '₹50,000'
  },
  {
    id: 'eee',
    name: 'Electrical & Electronics Engineering',
    code: 'EEE-TESLA',
    theme: 'High Voltage & Green Energy Core',
    description: 'Unleash electromagnetic dominance through smart grids, EV innovations, circuit simulations, and rapid electrical problem-solving.',
    iconName: 'Zap',
    accentColor: '#a855f7', // Electric Purple
    badge: 'Power Pulse',
    totalPrizes: '₹50,000'
  },
  {
    id: 'mech',
    name: 'Mechanical Engineering',
    code: 'MECH-TITAN',
    theme: 'Kinetic Forge & Digital Prototyping',
    description: 'Precision CAD drafting, engine teardown blitz, lathe mastery, and aerodynamic mechanical contraptions.',
    iconName: 'Wrench',
    accentColor: '#f43f5e', // Electric Rose Pink
    badge: 'Kinetic Lab',
    totalPrizes: '₹50,000'
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    code: 'CIVIL-STRUCT',
    theme: 'Mega Structures & Sustainable Geodesics',
    description: 'Bridges that defy destructive loads, concrete material tests, sustainable smart-city masterplans, and surveying challenges.',
    iconName: 'Building',
    accentColor: '#8b5cf6', // Electric Indigo Purple
    badge: 'Apex Build',
    totalPrizes: '₹50,000'
  },
  {
    id: 'aero',
    name: 'Aerospace Engineering',
    code: 'AERO-STRATO',
    theme: 'Stratospheric Propulsion & UAV Flight',
    description: 'High-thrust water rocketry, glider aerobatics, drone obstacle flight trials, and atmospheric telemetry analysis.',
    iconName: 'Send',
    accentColor: '#38bdf8', // Electric Sky Blue
    badge: 'Aero Vanguard',
    totalPrizes: '₹50,000'
  }
];

export const EVENTS_DATA: EventItem[] = [
  // 1. CSE
  {
    id: 'demo-cse-1',
    title: 'Demo CSE Event 1',
    deptId: 'cse',
    category: 'coding',
    tagline: 'Algorithmic problem solving and speed coding sprint.',
    description: 'Solve structured algorithmic challenges, optimize data structures, and debug complex code modules under timed constraints.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000', third: '₹2,500' },
    entryFee: '₹150 / Participant',
    teamSize: 'Individual (1)',
    venue: 'CSE Computing Lab 1',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#00f0ff',
    rounds: [
      { name: 'Round 1: Screening & Problem Solving', description: 'Timed assessment on algorithmic puzzles and problem sets.' },
      { name: 'Round 2: Code Duel Finals', description: 'Head-to-head live implementation challenge on test scenarios.' }
    ],
    rules: ['Standard programming languages permitted (C, C++, Java, Python).', 'Individual participation.'],
    coordinators: [{ name: 'CSE Coordinator 1', role: 'Student Lead', phone: '+91 98765 00001' }]
  },
  {
    id: 'demo-cse-2',
    title: 'Demo CSE Event 2',
    deptId: 'cse',
    category: 'technical',
    tagline: 'Software prototyping and technological innovation showcase.',
    description: 'Develop rapid software solutions addressing contemporary engineering use-cases with live prototype demonstrations.',
    prizes: { first: '₹12,000 + Certificate', second: '₹6,000', third: '₹3,000' },
    entryFee: '₹250 / Team',
    teamSize: '2 - 4 Members',
    venue: 'CSE Incubation Block',
    timing: '01:30 PM - 04:30 PM',
    featured: true,
    accentColor: '#00f0ff',
    rounds: [
      { name: 'Round 1: Architecture & Pitch', description: 'Present technical architecture and solution design.' },
      { name: 'Round 2: Working Demo Evaluation', description: 'Live prototype evaluation with jury Q&A.' }
    ],
    rules: ['Teams must submit functional code.', 'Open source libraries allowed with citation.'],
    coordinators: [{ name: 'CSE Coordinator 2', role: 'Student Lead', phone: '+91 98765 00002' }]
  },

  // 2. IT
  {
    id: 'demo-it-1',
    title: 'Demo IT Event 1',
    deptId: 'it',
    category: 'coding',
    tagline: 'Full-stack cloud applications and web API integration sprint.',
    description: 'Design and deploy modern web applications, integrating responsive client interfaces with RESTful backend microservices.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000', third: '₹2,500' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 2 Members',
    venue: 'IT Software Development Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#06b6d4',
    rounds: [
      { name: 'Round 1: API Design & Database Schema', description: 'Build structured database models and mock REST API routes.' },
      { name: 'Round 2: Full-Stack Integration Blitz', description: 'Connect frontend interface to live backend endpoints with auth flows.' }
    ],
    rules: ['Node.js, React, Python, or Go frameworks permitted.', 'GitHub repository submission required.'],
    coordinators: [{ name: 'IT Coordinator 1', role: 'Student Lead', phone: '+91 98765 00015' }]
  },
  {
    id: 'demo-it-2',
    title: 'Demo IT Event 2',
    deptId: 'it',
    category: 'technical',
    tagline: 'Network security, packet analysis, and server hardening.',
    description: 'Analyze network packet dumps, discover system vulnerabilities, and implement secure firewall routing policies in simulated environments.',
    prizes: { first: '₹12,000 + Certificate', second: '₹6,000', third: '₹3,000' },
    entryFee: '₹200 / Team',
    teamSize: '2 - 3 Members',
    venue: 'IT Networking & Systems Lab',
    timing: '01:30 PM - 04:30 PM',
    featured: true,
    accentColor: '#06b6d4',
    rounds: [
      { name: 'Round 1: Packet Tracing & Wireshark Challenge', description: 'Identify protocol anomalies and trace security breaches.' },
      { name: 'Round 2: Server Lockdown & Defense Defense', description: 'Patch vulnerable configurations and secure target services.' }
    ],
    rules: ['Virtual sandbox environment provided on lab machines.', 'Ethical hacking rules strictly enforced.'],
    coordinators: [{ name: 'IT Coordinator 2', role: 'Student Lead', phone: '+91 98765 00016' }]
  },

  // 3. AI&DS
  {
    id: 'demo-aids-1',
    title: 'Demo AI&DS Event 1',
    deptId: 'aids',
    category: 'coding',
    tagline: 'Predictive data analytics, statistical modeling, and insights.',
    description: 'Cleanse complex multi-dimensional datasets, perform exploratory data analysis, and train regression and classification models.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000', third: '₹2,500' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 2 Members',
    venue: 'AI&DS Data Analytics Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#3b82f6',
    rounds: [
      { name: 'Round 1: Data Wrangling & Feature Engineering', description: 'Clean raw noisy datasets and generate key statistical features.' },
      { name: 'Round 2: Predictive Model & Visual Dashboard', description: 'Submit predictions on test set with an interactive insights dashboard.' }
    ],
    rules: ['Python (Pandas, Scikit-learn, Seaborn) or R permitted.', 'Jupyter notebooks evaluated for code clarity.'],
    coordinators: [{ name: 'AI&DS Coordinator 1', role: 'Student Lead', phone: '+91 98765 00017' }]
  },
  {
    id: 'demo-aids-2',
    title: 'Demo AI&DS Event 2',
    deptId: 'aids',
    category: 'technical',
    tagline: 'Big data pipelines, stream processing, and business intelligence.',
    description: 'Architect scalable data ingestion pipelines, query large-scale data warehouses, and present actionable strategic business metrics.',
    prizes: { first: '₹12,000 + Certificate', second: '₹6,000', third: '₹3,000' },
    entryFee: '₹200 / Team',
    teamSize: '2 - 3 Members',
    venue: 'AI&DS Big Data Center',
    timing: '01:30 PM - 04:30 PM',
    featured: true,
    accentColor: '#3b82f6',
    rounds: [
      { name: 'Round 1: SQL Masterclass & Query Optimization', description: 'Construct optimized complex queries across relational tables.' },
      { name: 'Round 2: Real-Time Stream Analytics', description: 'Process simulated IoT streaming events and render live KPI charts.' }
    ],
    rules: ['SQL engines and visualization tools provided.', 'Evaluation based on execution speed and visualization clarity.'],
    coordinators: [{ name: 'AI&DS Coordinator 2', role: 'Student Lead', phone: '+91 98765 00018' }]
  },

  // 4. AIML
  {
    id: 'demo-aiml-1',
    title: 'Demo AIML Event 1',
    deptId: 'aiml',
    category: 'coding',
    tagline: 'Generative AI workflows, LLM agents, and prompt engineering.',
    description: 'Architect multi-agent autonomous loops, retrieval-augmented generation pipelines, and prompt optimizations on complex unstructured data.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 3 Members',
    venue: 'AI & Deep Learning Computing Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#c084fc',
    rounds: [
      { name: 'Round 1: Semantic Retrieval & Prompt Matrix', description: 'Construct contextual RAG pipelines for unstructured documents.' },
      { name: 'Round 2: Autonomous Agent Build', description: 'Deploy agentic workflows executing multi-step problem solving.' }
    ],
    rules: ['Foundation models permitted with architecture documentation.', 'Working code demonstration required.'],
    coordinators: [{ name: 'AIML Coordinator 1', role: 'Student Lead', phone: '+91 98765 00013' }]
  },
  {
    id: 'demo-aiml-2',
    title: 'Demo AIML Event 2',
    deptId: 'aiml',
    category: 'technical',
    tagline: 'Computer vision, deep learning inference, and neural models.',
    description: 'Train deep convolutional networks and transformers for real-time edge classification, object segmentation, and predictive analytics.',
    prizes: { first: '₹12,000 + Trophy', second: '₹6,000' },
    entryFee: '₹200 / Team',
    teamSize: '1 - 2 Members',
    venue: 'Center of Excellence in AI - 3rd Floor',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#c084fc',
    rounds: [
      { name: 'Round 1: Model Training & Augmentation', description: 'Train architecture on synthetic noisy computer vision datasets.' },
      { name: 'Round 2: Blind Test Benchmark', description: 'Inference speed and accuracy evaluated against test validation set.' }
    ],
    rules: ['PyTorch or TensorFlow frameworks permitted.', 'GPU cloud access or local workstations provided.'],
    coordinators: [{ name: 'AIML Coordinator 2', role: 'Student Lead', phone: '+91 98765 00014' }]
  },

  // 5. ECE
  {
    id: 'demo-ece-1',
    title: 'Demo ECE Event 1',
    deptId: 'ece',
    category: 'technical',
    tagline: 'Embedded circuits, microcontrollers, and hardware debugging.',
    description: 'Diagnose electronic circuits, interface IoT sensors with microcontrollers, and troubleshoot signal processing modules.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 2 Members',
    venue: 'ECE Microprocessors Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#ec4899',
    rounds: [
      { name: 'Round 1: Circuit Debugging', description: 'Identify and fix bugs on populated PCB boards.' },
      { name: 'Round 2: Sensor Interfacing Challenge', description: 'Program embedded boards to capture and process real-time signals.' }
    ],
    rules: ['Hardware boards and test equipment provided on-site.', 'Safety protocols strictly enforced.'],
    coordinators: [{ name: 'ECE Coordinator 1', role: 'Student Lead', phone: '+91 98765 00003' }]
  },
  {
    id: 'demo-ece-2',
    title: 'Demo ECE Event 2',
    deptId: 'ece',
    category: 'robotics',
    tagline: 'Autonomous robotics obstacle navigation and control systems.',
    description: 'Compete in autonomous line-following, maze traversal, and sensor-guided robot maneuvering in specialized arena tracks.',
    prizes: { first: '₹12,000 + Trophy', second: '₹6,000' },
    entryFee: '₹200 / Team',
    teamSize: '2 - 3 Members',
    venue: 'ECE Robotics Arena',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#ec4899',
    rounds: [
      { name: 'Round 1: Arena Time Trial', description: 'Timed traversal across standard obstacle course.' },
      { name: 'Round 2: Maze & Precision Duel', description: 'Finalist duel for minimum completion latency.' }
    ],
    rules: ['Robot dimensions must comply with arena regulations.', 'Onboard power limit: 12V DC.'],
    coordinators: [{ name: 'ECE Coordinator 2', role: 'Student Lead', phone: '+91 98765 00004' }]
  },

  // 6. EEE
  {
    id: 'demo-eee-1',
    title: 'Demo EEE Event 1',
    deptId: 'eee',
    category: 'technical',
    tagline: 'Power systems simulation and electrical network design.',
    description: 'Simulate high-voltage electrical circuits, smart grid distribution, and renewable energy conversion models in MATLAB/Simulink.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 2 Members',
    venue: 'EEE Simulation & Power Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#a855f7',
    rounds: [
      { name: 'Round 1: Power Circuit Design', description: 'Design circuit topology fulfilling load parameters.' },
      { name: 'Round 2: Fault Analysis & Troubleshooting', description: 'Simulate transient faults and implement protection schemes.' }
    ],
    rules: ['MATLAB / Proteus software available in lab.', 'Simulation files must be submitted before deadline.'],
    coordinators: [{ name: 'EEE Coordinator 1', role: 'Student Lead', phone: '+91 98765 00005' }]
  },
  {
    id: 'demo-eee-2',
    title: 'Demo EEE Event 2',
    deptId: 'eee',
    category: 'technical',
    tagline: 'Clean energy hardware prototypes and electric mobility expo.',
    description: 'Demonstrate working physical models in EV drivetrains, battery management systems, smart inverters, and sustainable power.',
    prizes: { first: '₹12,000 + Trophy', second: '₹6,000' },
    entryFee: '₹200 / Team',
    teamSize: '2 - 4 Members',
    venue: 'Electrical Machines Workshop',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#a855f7',
    rounds: [
      { name: 'Round 1: Model Demonstration', description: 'Live operational demonstration of hardware module.' },
      { name: 'Round 2: Viva & Technical Review', description: 'Q&A session with academic and industry evaluators.' }
    ],
    rules: ['Working hardware prototype is mandatory.', 'Display poster required.'],
    coordinators: [{ name: 'EEE Coordinator 2', role: 'Student Lead', phone: '+91 98765 00006' }]
  },

  // 7. MECH
  {
    id: 'demo-mech-1',
    title: 'Demo MECH Event 1',
    deptId: 'mech',
    category: 'technical',
    tagline: 'Precision 3D CAD modeling and mechanical design challenge.',
    description: 'Model intricate 3D mechanical components with parametric constraints, assembly mating, and drafting tolerances using CAD software.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Participant',
    teamSize: 'Individual (1)',
    venue: 'Mechanical CAD/CAM Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#f43f5e',
    rounds: [
      { name: 'Round 1: 2D Drafting to 3D Part', description: 'Generate 3D solid model from orthographic multi-view drawings.' },
      { name: 'Round 2: Dynamic Assembly & Stress Check', description: 'Assemble mechanical sub-system and perform basic FEA.' }
    ],
    rules: ['Standard CAD packages (SolidWorks / Fusion 360 / CATIA) provided.', 'Time-based evaluation.'],
    coordinators: [{ name: 'MECH Coordinator 1', role: 'Student Lead', phone: '+91 98765 00007' }]
  },
  {
    id: 'demo-mech-2',
    title: 'Demo MECH Event 2',
    deptId: 'mech',
    category: 'technical',
    tagline: 'Engine teardown, assembly blitz, and mechanical fabrication.',
    description: 'Race against the clock in disassembling and assembling IC engines, transmission gearboxes, and mechanical systems with proper tool torque.',
    prizes: { first: '₹12,000 + Trophy', second: '₹6,000' },
    entryFee: '₹200 / Team',
    teamSize: '2 - 3 Members',
    venue: 'Thermal & IC Engines Workshop',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#f43f5e',
    rounds: [
      { name: 'Round 1: Rapid Teardown', description: 'Systematic engine breakdown following safe shop practices.' },
      { name: 'Round 2: Precision Re-assembly & Inspection', description: 'Reassemble components to original tolerances and timing alignment.' }
    ],
    rules: ['Workshop safety gear (shoes, safety glasses) mandatory.', 'Tools provided by department.'],
    coordinators: [{ name: 'MECH Coordinator 2', role: 'Student Lead', phone: '+91 98765 00008' }]
  },

  // 8. CIVIL
  {
    id: 'demo-civil-1',
    title: 'Demo CIVIL Event 1',
    deptId: 'civil',
    category: 'technical',
    tagline: 'Structural bridge truss design and destructive load testing.',
    description: 'Construct lightweight bridge structures using designated materials and test structural efficiency ratios under hydraulic load.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '2 - 3 Members',
    venue: 'Civil Structures & Strength of Materials Lab',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#8b5cf6',
    rounds: [
      { name: 'Round 1: Dimension & Weight Inspection', description: 'Verify bridge geometry, clearance, and weight limit.' },
      { name: 'Round 2: Progressive Load to Failure', description: 'Incremental hydraulic loading to determine max failure load.' }
    ],
    rules: ['Pre-built or on-site models adhering to bridge specifications.', 'Load-to-weight ratio determines score.'],
    coordinators: [{ name: 'CIVIL Coordinator 1', role: 'Student Lead', phone: '+91 98765 00009' }]
  },
  {
    id: 'demo-civil-2',
    title: 'Demo CIVIL Event 2',
    deptId: 'civil',
    category: 'technical',
    tagline: 'Precision surveying, total station leveling, and CAD mapping.',
    description: 'Execute field surveying utilizing advanced Total Station equipment, calculate elevation gradients, and draft topographic terrain maps.',
    prizes: { first: '₹10,000 + Trophy', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '2 - 3 Members',
    venue: 'Campus Survey Ground & GIS Lab',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#8b5cf6',
    rounds: [
      { name: 'Round 1: Field Triangulation', description: 'Benchmark readings and horizontal/vertical angle capture.' },
      { name: 'Round 2: Contour Mapping & Analysis', description: 'Calculate area, volume cut/fill, and plot digital survey.' }
    ],
    rules: ['Total Stations and surveying accessories provided.', 'Time limit: 60 minutes field work.'],
    coordinators: [{ name: 'CIVIL Coordinator 2', role: 'Student Lead', phone: '+91 98765 00010' }]
  },

  // 9. AERO
  {
    id: 'demo-aero-1',
    title: 'Demo AERO Event 1',
    deptId: 'aero',
    category: 'technical',
    tagline: 'High-pressure water rocketry altitude and payload trajectory.',
    description: 'Design aerodynamic pressure rockets with custom fin configurations and nozzle dynamics for peak altitude and controlled parachute recovery.',
    prizes: { first: '₹10,000 + Certificate', second: '₹5,000' },
    entryFee: '₹150 / Team',
    teamSize: '1 - 3 Members',
    venue: 'College Sports Grounds - Launch Pad',
    timing: '10:00 AM - 01:00 PM',
    featured: true,
    accentColor: '#38bdf8',
    rounds: [
      { name: 'Round 1: Design & Stability Check', description: 'Inspect center of gravity vs center of pressure alignment.' },
      { name: 'Round 2: Pressurized Launch & Airtime Score', description: 'Dual launch trials measuring flight stability and apogee.' }
    ],
    rules: ['Standard multi-stage water rockets complying with nozzle dimensions.', 'Max air pressure: 60 PSI.'],
    coordinators: [{ name: 'AERO Coordinator 1', role: 'Student Lead', phone: '+91 98765 00011' }]
  },
  {
    id: 'demo-aero-2',
    title: 'Demo AERO Event 2',
    deptId: 'aero',
    category: 'technical',
    tagline: 'RC drone flight maneuverability, obstacle racing, and aerodynamics.',
    description: 'Pilot multi-rotor drones through 3D obstacle hoops, landing pads, and tight gates under telemetry timing.',
    prizes: { first: '₹12,000 + Trophy', second: '₹6,000' },
    entryFee: '₹200 / Team',
    teamSize: '1 - 2 Members',
    venue: 'Main Athletic Grounds / Flight Arena',
    timing: '02:00 PM - 05:00 PM',
    featured: true,
    accentColor: '#38bdf8',
    rounds: [
      { name: 'Round 1: Slalom Course Time Trial', description: 'Navigate hoop gates with penalty seconds for gate touches.' },
      { name: 'Round 2: Precision Spot Landing & Speed Lap', description: 'High-speed flight circuit and bullseye touchdown.' }
    ],
    rules: ['Drones must pass fail-safe propeller and radio link checks.', 'Frequencies mapped to prevent pilot interference.'],
    coordinators: [{ name: 'AERO Coordinator 2', role: 'Student Lead', phone: '+91 98765 00012' }]
  }
];

export const FEST_SCHEDULE: ScheduleItem[] = [
  { time: '09:00 AM', title: 'Grand Fest Inauguration & Jyothi Prajwalana', department: 'Central Administration', venue: 'Main Auditorium', category: 'Keynote' },
  { time: '09:30 AM', title: 'Demo CSE Event 1', department: 'CSE', venue: 'CSE Computing Lab 1', category: 'Coding' },
  { time: '10:00 AM', title: 'Demo IT Event 1', department: 'IT', venue: 'IT Software Development Lab', category: 'Coding' },
  { time: '10:30 AM', title: 'Demo AI&DS Event 1', department: 'AI&DS', venue: 'AI&DS Data Analytics Lab', category: 'Coding' },
  { time: '11:00 AM', title: 'Demo AIML Event 1', department: 'AIML', venue: 'AI Deep Learning Lab', category: 'Coding' },
  { time: '11:30 AM', title: 'Demo ECE Event 1', department: 'ECE', venue: 'ECE Microprocessors Lab', category: 'Technical' },
  { time: '12:00 PM', title: 'Demo EEE Event 1', department: 'EEE', venue: 'EEE Simulation Lab', category: 'Technical' },
  { time: '12:30 PM', title: 'Demo MECH Event 1', department: 'Mechanical', venue: 'Mechanical CAD Lab', category: 'Technical' },
  { time: '01:00 PM', title: 'Demo CIVIL Event 1', department: 'Civil', venue: 'Civil Structures Lab', category: 'Technical' },
  { time: '01:30 PM', title: 'Power Networking & Lunch Intermission', department: 'All Branches', venue: 'College Food Court', category: 'Break' },
  { time: '02:00 PM', title: 'Demo AERO Event 1', department: 'Aerospace', venue: 'Sports Ground Launch Pad', category: 'Technical' },
  { time: '02:30 PM', title: 'Demo CSE Event 2', department: 'CSE', venue: 'CSE Incubation Block', category: 'Technical' },
  { time: '03:00 PM', title: 'Demo IT Event 2', department: 'IT', venue: 'IT Networking & Systems Lab', category: 'Technical' },
  { time: '03:30 PM', title: 'Demo AI&DS Event 2', department: 'AI&DS', venue: 'AI&DS Big Data Center', category: 'Technical' },
  { time: '04:00 PM', title: 'Demo AIML Event 2', department: 'AIML', venue: 'Center of Excellence in AI', category: 'Technical' },
  { time: '04:30 PM', title: 'Demo ECE Event 2', department: 'ECE', venue: 'ECE Robotics Arena', category: 'Robotics' },
  { time: '05:00 PM', title: 'Demo EEE Event 2', department: 'EEE', venue: 'Electrical Machines Workshop', category: 'Technical' },
  { time: '05:30 PM', title: 'Demo MECH Event 2', department: 'Mechanical', venue: 'Thermal Workshop', category: 'Technical' },
  { time: '06:00 PM', title: 'Demo CIVIL Event 2', department: 'Civil', venue: 'Campus Survey Ground', category: 'Technical' },
  { time: '06:30 PM', title: 'Demo AERO Event 2', department: 'Aerospace', venue: 'Flight Arena', category: 'Technical' },
  { time: '07:00 PM', title: 'Grand Valedictory & Prize Distribution Ceremony', department: 'Central Administration', venue: 'Main Auditorium', category: 'Award' }
];

export const CAMPUS_SPOTS: CampusSpot[] = [
  {
    id: 'open-theatre',
    name: 'Open Air Theatre (OAT)',
    building: 'Central Tech Arena',
    eventsCount: 5,
    highlight: 'Robo Wars Battle Cage, Technical Demonstrations, Project Expos',
    x: 48,
    y: 42,
    icon: 'Radio'
  },
  {
    id: 'sports-stadium',
    name: 'Main Stadium & Flight Grounds',
    building: 'College Athletic Grounds',
    eventsCount: 4,
    highlight: 'Rocket Launches, Drone Flight Competitions, Grand Award Ceremonies',
    x: 52,
    y: 72,
    icon: 'Flame'
  }
];

export const LEGACY_STATS = [
  { label: 'Annual Editions', value: '16+' },
  { label: 'Colleges Represented', value: '180+' },
  { label: 'Total Cash Awarded', value: '₹45L+' },
  { label: 'Student Volunteers', value: '450+' }
];
