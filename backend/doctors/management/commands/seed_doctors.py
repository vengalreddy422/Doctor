import random
from datetime import time as time_cls, timedelta
from decimal import Decimal
from django.utils import timezone
from django.core.management.base import BaseCommand
from doctors.models import Doctor, DoctorSchedule, Holiday
from appointments.models import Appointment, Slot
from payments.models import Payment

FIRST_NAMES = [
    # Male names
    "Aarav", "Aditya", "Amit", "Anand", "Anil", "Arjun", "Ashok", "Bhaskar", "Chirag", "Deepak",
    "Dev", "Dinesh", "Gaurav", "Girish", "Harish", "Hemant", "Ishaan", "Jay", "Kalyan", "Karan",
    "Karthik", "Kiran", "Kishore", "Madhav", "Manish", "Manoj", "Mukesh", "Naresh", "Naveen", "Nikhil",
    "Nitin", "Pankaj", "Pradeep", "Prakash", "Pranav", "Prashant", "Praveen", "Rahul", "Raj", "Rajesh",
    "Rajiv", "Rakesh", "Ramesh", "Ravi", "Rishabh", "Rohan", "Rohit", "Sachin", "Sameer", "Sandeep",
    "Sanjay", "Santosh", "Satish", "Siddharth", "Suresh", "Tarun", "Varun", "Venkat", "Vikas", "Vikram",
    "Vinay", "Vipin", "Vishal", "Vivek", "Yash",
    # Female names
    "Aadya", "Aarti", "Aditi", "Ananya", "Anita", "Anjali", "Ankita", "Anu", "Aparna", "Archana",
    "Bhavna", "Chaitali", "Deepa", "Divya", "Geeta", "Ishita", "Jyoti", "Kavita", "Kavya", "Keerthi",
    "Komal", "Lakshmi", "Madhavi", "Mamta", "Manju", "Meera", "Megha", "Monika", "Namrata", "Neelam",
    "Neha", "Nisha", "Pallavi", "Pooja", "Pragya", "Pratibha", "Preeti", "Priya", "Priyanka", "Radha",
    "Radhika", "Rashmi", "Renu", "Ritu", "Roshni", "Rupal", "Sandhya", "Sangita", "Sarita", "Shalini",
    "Shikha", "Shilpa", "Shobha", "Shruti", "Sneha", "Sonali", "Sowmya", "Sudha", "Sunita", "Supriya",
    "Swati", "Tanuja", "Tanvi", "Uma", "Vaishali", "Vandana", "Varsha", "Vidya", "Vinita", "Yamini"
]

LAST_NAMES = [
    "Agarwal", "Banerjee", "Bhatia", "Chakraborty", "Chauhan", "Chopra", "Das", "Deshmukh",
    "Dutta", "Gupta", "Iyer", "Jadhav", "Jain", "Jha", "Joshi", "Kapoor", "Kaul", "Khan",
    "Khanna", "Kulkarni", "Kumar", "Mahajan", "Malhotra", "Mehta", "Mishra", "Mukherjee",
    "Nair", "Nambiar", "Pandey", "Patel", "Patil", "Pillai", "Prasad", "Purohit", "Rao",
    "Reddy", "Roy", "Saxena", "Sen", "Shah", "Sharma", "Shetty", "Shukla", "Singh", "Sinha",
    "Srivastava", "Surve", "Trivedi", "Varma", "Verma", "Yadav"
]

SPECIALIZATIONS_DATA = [
    {
        "name": "Cardiology",
        "qualifications": ["MBBS, MD (Medicine), DM (Cardiology)", "MBBS, DNB (Cardiology), FACC", "MBBS, MD, FRCP (Cardiology)"],
        "fees": [800, 1000, 1200, 1500, 1800, 2000],
        "bios": [
            "Senior Interventional Cardiologist with extensive experience in coronary angioplasty, heart failure management, and preventive cardiovascular healthcare.",
            "Specialist in cardiac electrophysiology, non-invasive cardiology, echocardiography, and complex clinical hypertension management.",
            "Renowned consultant cardiologist specializing in pediatric and adult cardiovascular interventions, lipid disorders, and structural heart disease."
        ]
    },
    {
        "name": "Dermatology",
        "qualifications": ["MBBS, MD (Dermatology, Venereology & Leprosy)", "MBBS, DVD, DNB (Dermatology)", "MBBS, MD, Fellowship in Aesthetic Dermatology"],
        "fees": [500, 600, 750, 900, 1200],
        "bios": [
            "Expert dermatologist and cosmetologist with specialized focus in acne treatment, psoriasis, clinical trichology, and advanced laser therapies.",
            "Clinical dermatologist dedicated to pediatric skin care, chronic eczema, allergy testing, and surgical dermato-pathology.",
            "Aesthetic dermatologist specializing in skin rejuvenation, pigmentation correction, anti-aging solutions, and hair restoration."
        ]
    },
    {
        "name": "Neurology",
        "qualifications": ["MBBS, MD (General Medicine), DM (Neurology)", "MBBS, DNB (Neurology), FINR", "MBBS, MD, MCh (Neuro Surgery), FEBNS"],
        "fees": [900, 1100, 1300, 1600, 2000, 2200],
        "bios": [
            "Leading neurologist focused on stroke intervention, epilepsy management, headache disorders, and neuro-rehabilitation.",
            "Movement disorder and Parkinson's disease specialist with deep expertise in neurodegenerative conditions and EMG/NCV diagnostics.",
            "Comprehensive neuro specialist managing neuro-muscular disorders, multiple sclerosis, vertigo, and peripheral neuropathy."
        ]
    },
    {
        "name": "Orthopedics",
        "qualifications": ["MBBS, MS (Orthopaedics)", "MBBS, DNB (Orthopaedics), MCh (Ortho)", "MBBS, MS, Fellowship in Joint Replacement & Arthroscopy"],
        "fees": [600, 700, 850, 1000, 1300, 1500],
        "bios": [
            "Renowned orthopedic surgeon specializing in robotic joint replacement (knee & hip), sports injuries, and trauma reconstruction.",
            "Spine care and arthroscopy specialist treating degenerative disc disorders, back pain, and minimally invasive sports ligament repairs.",
            "Pediatric and geriatric orthopedic consultant focused on arthritis care, fracture healing, osteoporosis, and posture correction."
        ]
    },
    {
        "name": "Pediatrics",
        "qualifications": ["MBBS, MD (Pediatrics)", "MBBS, DCH, DNB (Pediatrics)", "MBBS, MD, Fellowship in Neonatology"],
        "fees": [450, 500, 600, 750, 900],
        "bios": [
            "Dedicated pediatrician offering comprehensive child wellness checkups, newborn intensive care, vaccination schedules, and growth monitoring.",
            "Pediatric specialist with focus on childhood asthma, nutritional guidance, infectious diseases, and developmental milestone tracking.",
            "Neonatologist and pediatric consultant experienced in acute childhood emergencies, allergies, and adolescent healthcare."
        ]
    },
    {
        "name": "Gynecology & Obstetrics",
        "qualifications": ["MBBS, MS (Obstetrics & Gynaecology)", "MBBS, DGO, DNB (OB-GYN), FICOG", "MBBS, MD, Fellowship in Laparoscopic Gynaecology"],
        "fees": [600, 750, 900, 1100, 1400],
        "bios": [
            "Leading obstetrician and gynecologist specializing in high-risk pregnancies, normal deliveries, and holistic maternal healthcare.",
            "Reproductive medicine and fertility consultant offering advanced PCOD/PCOS management, laparoscopic surgery, and menstrual health care.",
            "Gynecological oncologist and laparoscopic surgeon treating fibroids, endometriosis, menopause transitions, and wellness screenings."
        ]
    },
    {
        "name": "Psychiatry",
        "qualifications": ["MBBS, MD (Psychiatry)", "MBBS, DPM, DNB (Psychiatry)", "MBBS, MD, MRCPsych (UK)"],
        "fees": [700, 850, 1000, 1250, 1500, 1800],
        "bios": [
            "Compassionate psychiatrist specializing in anxiety disorders, clinical depression, cognitive behavioral therapy, and stress management.",
            "Consultant neuropsychiatrist expert in sleep disorders, adult ADHD, mood stabilizers, and trauma-informed psychological care.",
            "Child and adolescent psychiatrist providing holistic guidance for behavioral challenges, academic stress, and family therapy."
        ]
    },
    {
        "name": "Ophthalmology",
        "qualifications": ["MBBS, MS (Ophthalmology)", "MBBS, DO, DNB (Ophthalmology), FICO", "MBBS, MS, Fellowship in Cornea & Refractive Surgery"],
        "fees": [500, 600, 700, 850, 1100],
        "bios": [
            "Senior eye specialist with expertise in blade-free LASIK, micro-incision cataract surgery, and refractive corrections.",
            "Glaucoma and medical retina specialist providing comprehensive eye examinations, diabetic retinopathy laser care, and dry eye relief.",
            "Cornea consultant and pediatric ophthalmologist treating strabismus/squint, amblyopia, corneal dystrophies, and ocular allergies."
        ]
    },
    {
        "name": "ENT (Ear, Nose & Throat)",
        "qualifications": ["MBBS, MS (ENT / Otorhinolaryngology)", "MBBS, DLO, DNB (ENT)", "MBBS, MS, Fellowship in Head & Neck Surgery"],
        "fees": [500, 600, 750, 900, 1200],
        "bios": [
            "Otorhinolaryngologist specializing in endoscopic sinus surgery (FESS), hearing restoration, and micro-ear surgeries.",
            "ENT specialist expert in allergic rhinitis, snoring/sleep apnea management, vertigo treatments, and tonsillectomies.",
            "Head and neck surgical consultant managing voice disorders, thyroid conditions, salivary gland diseases, and pediatric ENT."
        ]
    },
    {
        "name": "General Medicine",
        "qualifications": ["MBBS, MD (General Medicine)", "MBBS, DNB (Internal Medicine)", "MBBS, MD, FICP"],
        "fees": [400, 500, 600, 700, 850],
        "bios": [
            "Senior physician with 18+ years experience in chronic lifestyle disorders, diabetes reversal programs, and infectious diseases.",
            "Internal medicine specialist providing comprehensive health screenings, diagnostic workups, and adult vaccinations.",
            "General physician focused on geriatric care, seasonal fevers, hypertension, metabolic disorders, and preventative wellness."
        ]
    },
    {
        "name": "Gastroenterology",
        "qualifications": ["MBBS, MD (Medicine), DM (Medical Gastroenterology)", "MBBS, DNB (Gastroenterology), FACG", "MBBS, MD, MCh (Surgical Gastroenterology)"],
        "fees": [800, 950, 1100, 1350, 1600, 1900],
        "bios": [
            "Gastroenterologist and hepatologist specializing in therapeutic endoscopy, fatty liver disease, acid reflux, and inflammatory bowel disease (IBD).",
            "Digestive health specialist treating irritable bowel syndrome (IBS), peptic ulcers, pancreatitis, and colon polyps.",
            "Advanced interventional gastro-endoscopist skilled in ERCP, endoscopic ultrasound (EUS), and minimally invasive GI procedures."
        ]
    },
    {
        "name": "Oncology",
        "qualifications": ["MBBS, MD (Radiotherapy), DM (Medical Oncology)", "MBBS, MS, MCh (Surgical Oncology)", "MBBS, DNB (Medical Oncology), ESMO Certified"],
        "fees": [1000, 1200, 1500, 1800, 2200, 2500],
        "bios": [
            "Leading medical oncologist specializing in targeted precision chemotherapy, immunotherapy, and breast and lung cancer treatments.",
            "Surgical oncologist experienced in organ-preserving cancer resections, laparoscopic oncologic surgeries, and head/neck tumors.",
            "Radiation oncologist and clinical cancer researcher dedicated to stereotactic radiation therapies (SBRT/SRT) and palliative care."
        ]
    },
    {
        "name": "Pulmonology",
        "qualifications": ["MBBS, MD (Pulmonary Medicine)", "MBBS, DTCD, DNB (Respiratory Diseases)", "MBBS, MD, Fellowship in Sleep Medicine & Interventional Pulmonology"],
        "fees": [600, 750, 900, 1100, 1350],
        "bios": [
            "Chest physician and pulmonologist treating bronchial asthma, COPD, chronic bronchitis, pulmonary fibrosis, and respiratory infections.",
            "Interventional pulmonologist skilled in bronchoscopy, pleural effusion management, and occupational lung disorder screening.",
            "Sleep medicine and respiratory care consultant providing CPAP titration, sleep apnea diagnostics, and post-COVID lung recovery."
        ]
    },
    {
        "name": "Endocrinology",
        "qualifications": ["MBBS, MD (Internal Medicine), DM (Endocrinology)", "MBBS, DNB (Endocrinology), FACE", "MBBS, MD, Fellowship in Diabetes & Metabolism"],
        "fees": [750, 900, 1100, 1300, 1600],
        "bios": [
            "Senior endocrinologist and diabetologist specializing in complex diabetes management, thyroid disorders, and pituitary conditions.",
            "Hormonal health expert treating PCOS, obesity management, osteoporosis, adrenal disorders, and metabolic syndrome.",
            "Pediatric and adult endocrinologist treating growth hormone deficiencies, early puberty, gestational diabetes, and thyroid nodules."
        ]
    },
    {
        "name": "Nephrology & Urology",
        "qualifications": ["MBBS, MD, DM (Nephrology)", "MBBS, MS, MCh (Urology)", "MBBS, DNB (Nephrology), FISN"],
        "fees": [850, 1000, 1200, 1500, 1800, 2100],
        "bios": [
            "Renowned nephrologist specializing in chronic kidney disease (CKD) staging, hemodialysis management, and kidney transplant care.",
            "Urologist and andrologist expert in laser kidney stone removal (RIRS/PCNL), prostate enlargement (TURP), and urinary tract health.",
            "Transplant nephrologist providing specialized care in glomerulonephritis, diabetic kidney health, and resistant hypertension."
        ]
    }
]

HOSPITALS = [
    "Apollo Speciality Hospital, Bannerghatta",
    "Fortis Memorial Research Institute",
    "Max Super Speciality Hospital, Saket",
    "Manipal Hospital, Old Airport Road",
    "Care Hospitals, Banjara Hills",
    "Aster Medcity & Wellness Center",
    "Medicover Hospitals, Hi-Tech City",
    "Narayana Health City",
    "Sunshine Hospitals, Gachibowli",
    "KIMS Super Speciality Hospital",
    "Gleneagles Global Health City",
    "Columbia Asia Referral Hospital",
    "Yashoda Hospitals, Secunderabad",
    "Lilavati Hospital & Research Centre",
    "Sir Ganga Ram Hospital"
]

FIXED_SLOTS = [
    (time_cls(10, 0), time_cls(11, 0)),
    (time_cls(11, 0), time_cls(12, 0)),
    (time_cls(12, 0), time_cls(13, 0)),
    (time_cls(14, 0), time_cls(15, 0)),
    (time_cls(15, 0), time_cls(16, 0)),
    (time_cls(16, 0), time_cls(17, 0)),
]

class Command(BaseCommand):
    help = "Seed 150 doctors across 15 specializations with diverse schedules"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=150,
            help='Total number of doctors to generate (default: 150)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete existing appointments, slots, schedules, and doctors before seeding'
        )

    def handle(self, *args, **options):
        total_count = options['count']
        clear_existing = options['clear']

        if clear_existing:
            self.stdout.write(self.style.WARNING("Clearing existing payments, appointments, slots, schedules, and doctors..."))
            Payment.objects.all().delete()
            Appointment.objects.all().delete()
            Slot.objects.all().delete()
            DoctorSchedule.objects.all().delete()
            Holiday.objects.all().delete()
            Doctor.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        num_specs = len(SPECIALIZATIONS_DATA)
        doctors_per_spec = max(1, total_count // num_specs)
        remainder = total_count - (doctors_per_spec * num_specs)

        used_names = set(Doctor.objects.values_list('name', flat=True))
        today = timezone.localdate()

        self.stdout.write(f"Creating {total_count} doctors across {num_specs} specializations...")

        all_doctors = []
        doctor_schedules_map = []

        for spec_idx, spec in enumerate(SPECIALIZATIONS_DATA):
            count_for_this_spec = doctors_per_spec + (1 if spec_idx < remainder else 0)

            for doc_idx in range(count_for_this_spec):
                while True:
                    first = random.choice(FIRST_NAMES)
                    last = random.choice(LAST_NAMES)
                    full_name = f"{first} {last}"
                    if full_name not in used_names:
                        used_names.add(full_name)
                        break

                qual = random.choice(spec["qualifications"])
                fee = Decimal(str(random.choice(spec["fees"])))
                exp = random.randint(4, 30)
                rating = Decimal(str(round(random.uniform(4.3, 5.0), 1)))
                reviews = random.randint(18, 380)
                hospital = random.choice(HOSPITALS)
                bio = random.choice(spec["bios"])

                # Patterns:
                # 0, 1 -> Weekend only ('sat', 'sun')
                # 2, 3, 4 -> Mon/Wed/Fri
                # 5, 6 -> Tue/Thu/Sat
                # 7, 8 -> Weekdays (Mon-Fri)
                # 9 -> Full week (Mon-Sun)
                choice = doc_idx % 10
                if choice in (0, 1):
                    active_days = ['sat', 'sun']
                elif choice in (2, 3, 4):
                    active_days = ['mon', 'wed', 'fri']
                elif choice in (5, 6):
                    active_days = ['tue', 'thu', 'sat']
                elif choice in (7, 8):
                    active_days = ['mon', 'tue', 'wed', 'thu', 'fri']
                else:
                    active_days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

                doc = Doctor(
                    name=full_name,
                    specialization=spec["name"],
                    qualification=qual,
                    experience_years=exp,
                    fee=fee,
                    rating=rating,
                    total_reviews=reviews,
                    hospital_name=hospital,
                    available_days=','.join(active_days),
                    bio=bio,
                    is_active=True
                )
                all_doctors.append(doc)
                doctor_schedules_map.append(active_days)

        created_doctors = Doctor.objects.bulk_create(all_doctors)
        self.stdout.write(f"Created {len(created_doctors)} Doctor profiles. Generating schedules and slots...")

        all_schedules = []
        all_slots = []

        for doc, active_days in zip(created_doctors, doctor_schedules_map):
            active_set = set(active_days)
            for day in active_days:
                all_schedules.append(
                    DoctorSchedule(
                        doctor=doc,
                        day_of_week=day,
                        start_time=time_cls(10, 0),
                        end_time=time_cls(17, 0),
                        is_active=True
                    )
                )

            # Generate rolling 7 target dates for this doctor
            target_dates = []
            offset = 0
            while len(target_dates) < 7 and offset < 365:
                candidate = today + timedelta(days=offset)
                day_code = candidate.strftime('%a').lower()
                if day_code in active_set:
                    target_dates.append(candidate)
                offset += 1

            for target_date in target_dates:
                for slot_start, slot_end in FIXED_SLOTS:
                    all_slots.append(
                        Slot(
                            doctor=doc,
                            date=target_date,
                            start_time=slot_start,
                            end_time=slot_end,
                            max_capacity=5,
                        )
                    )

        DoctorSchedule.objects.bulk_create(all_schedules)
        Slot.objects.bulk_create(all_slots, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {len(created_doctors)} doctors, {len(all_schedules)} schedules, and {len(all_slots)} slots!"
        ))
