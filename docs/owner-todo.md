# Questions for the owner

Answer inline; the implementer will pick them up. Add new ones at the bottom, grouped by project.

## General
- [ ] Confirm the project list in `docs/content-intake.md`, and which extra repos in `~/work` are real/finished/public (esp. cloud ones: `aratc_aws`, `k8s_platform_bootstrap`, `serverless_url_shortner`).
- [ ] Switch `mecodes.live` DNS to GitHub Pages now, or launch on `<user>.github.io` first? Which GitHub repo name?
- [ ] Plausible (paid, hosted) or no analytics at launch?
- [ ] OK to show UNICEF / government app screenshots, or keep them confidential (text only)? yes show all it's fine. 
- [ ] Photo of you for the CV / hero? (German CVs usually have one; optional.)  '/Users/mohamedessa/Downloads/DARK _ The Official Guide _ NETFLIX.png'

## aratc
- [ ] Screenshots contain test data ("QA Private Session Course", "Notification Trainer") and the "LOCAL" ribbon. Can you recapture with demo data, release mode, banner off? Until then the pipeline masks them.
- [ ] Is `~/work/aratc_aws` the cloud side of Aratc (would make a great Mobile↔Cloud edge)?

## qanony
- [ ] `~/Documents/qanoni screenshots` is empty; using `~/work/qanony_flutter/store_screenshots/` instead. OK? ok 
- [ ] Is Qanony public / on the stores? Links? yes 


links and projects found in ~/work/[project_name] 

Yafleet (no code): https://play.google.com/store/apps/details?id=com.intrazero.majdiyafleet&hl=en

qanoni: https://play.google.com/store/apps/details?id=com.qanony.qanony https://apps.apple.com/us/app/qanoni-services/id6761679733

Bioot: https://play.google.com/store/apps/details?id=com.bioot.client
https://apps.apple.com/sk/app/bioot-real-estate/id6787982763
https://apps.apple.com/sk/app/bioot-partners/id6787982982
it's two apps both for real-estate agents/developers and users. it has calls etc. 

the egyptian board for medial professions to log cases etc to report them, it's a government of health app: 
https://play.google.com/store/apps/details?id=com.intrazero.ehcboard
it's screenshots (bear unprocessed): '/Users/mohamedessa/Downloads/the_egyptian_board_screenshots' (feel free to move them somewhere)


heaven_flowers: screenshots here: '/Users/mohamedessa/Downloads/heaven_flower_screenshots' (same for all, feel free to move)
it's links: 
https://apps.apple.com/us/app/heaven-flower/id6743226370
https://play.google.com/store/apps/details?id=com.intrazero.flowers&hl=en_US

aratc: 
https://play.google.com/store/apps/details?id=com.intrazero.aratcapp&hl=en_US
https://apps.apple.com/us/app/aratc/id1640463270
'/Users/mohamedessa/Documents/aratc screenshots' (feel free to process them as u may)




## all projects
here are the git links (if they aren't already in ~/work/)
that's the group they're on "https://gitlab.com/intrazero/mobileapp" and for indivudaul ones it's like this: 
example: "https://gitlab.com/intrazero/mobileapp/qanony_flutter"
if you want to look at code to infer what it does and like 
here is a list of the full (simply copied from UI): "
Homepage
Primary navigation
Group
M
mobileapp

Pinned

Feature catalog

Manage

Plan

Code

Build

Deploy

Operate

Observe

Settings

Help

Collapse sidebar
avatarintrazero
mobileapp
M
mobileapp
Group ID: 12679202
Subgroups and projects
Shared projects
Shared groups
Inactive
Search (3 character minimum)
Sort by:
F
flutter-packages
2
1
0
Created Sep 24, 2024
Q
qanony_flutter
0
Created 7 months ago
I
intrazeroemployee
1
Created 9 months ago
I
i_tutor
0
Created 10 months ago
S
SIS-MoHP
0
Created Sep 1, 2025
G
gharemeen
1
Created Aug 28, 2025
W
waste-management
1
Created May 14, 2025
B
BIOOT Kotlin
0
Created Apr 23, 2025
F
flowers
1
Created Jan 21, 2025
Y
yafleet
1
Created Dec 5, 2024
A
Al Diplomacy
1
Created Nov 18, 2024
H
homevalley-crm
0
Created Oct 27, 2024
J
jahzeen-ios
0
Created Oct 8, 2024
J
jahzeen-android
0
Created Oct 8, 2024
M
motary
1
Created Oct 3, 2024
I
Iassets mobile
1
Created Jul 14, 2024
I
ITicket IOS
0
Created Apr 15, 2024
H
HIS
0
Created Mar 19, 2024
U
unicef cma
1
Created Jan 19, 2024
J
javaQR-ios-task
0
Created Jan 12, 2024
1
2
3"

## assets (added 2026-10-08 by the asset pipeline)
- [ ] aratc: the home hero still shows "QA Private Session Course / Notification Trainer" demo text in one card (in-screen, can't mask). Recapture home with real/neutral course data for a cleaner hero? Current output is still good.
- [ ] heaven-flowers: the screenshots you gave are pre-made store frames (phone already in a purple branded frame). They're fine as a gallery, but for the tilted hero/thumb I'd want raw in-app screens (no frame). Can you grab 4-5 raw captures (release mode, banner off)? Otherwise I'll use the framed ones as-is.
- [ ] ehc-board (Egyptian Board health app): I have 5 clean screens — want me to add it as a project node + generate assets? (It's a government health app; you said all screenshots are OK to show.)
- [ ] bioot (two real-estate apps): no screenshots yet. Send captures, or should I render a cloud/diagram-style cover from the repo instead?

## dossiers (added 2026-10-08, session 2)
- [ ] release-pipeline: the dossier shows a flow diagram **Push → Build → Sign → Upload → Submit**. The plan also had a **Test** stage, but your content only says build/sign/submit, so I left it out. Do the pipelines run tests (unit/widget/integration)? If yes I'll add the stage.
- [ ] No project has an impact **metric** (a number) yet. The dossier shows a big number when one exists — any you can state and stand behind (e.g. release time in hours before/after, crash-free %, downloads)?

## CV vs LinkedIn dates (added 2026-10-08, from the CV PDF)
- [ ] **IntraZero start:** CV says **Aug 2024** (with your note "may not aug"), the intake sheet (LinkedIn) says **May 2024**. Which month?
- [ ] **Freelance:** CV says **Jun 2022 – Jul 2024**, LinkedIn says **Jan 2022 – Dec 2024**. Which range should the site use?
- [ ] **Title:** CV "Flutter Developer", LinkedIn "Senior Mobile Engineer (Mobile & Platform)". The site currently says "Senior Mobile Engineer" on the Mobile track; keep?
