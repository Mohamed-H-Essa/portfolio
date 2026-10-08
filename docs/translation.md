# Translation conventions (EN · DE · AR)

The site speaks to recruiters and engineers in three markets. Each language uses the words people in that market
actually use for this work, not a word-for-word copy of the English. UI strings live in `src/i18n/{en,de,ar}.json`
(same keys in all three); project text in `src/content/projects/*.yaml` (`en` required, `de`/`ar` drafts with
`review: true` until the owner approves).

## Never translate
| What | Examples | Why |
|---|---|---|
| Product, app and company names | Qanony, ARATC, Bioot, Heaven Flowers, Intrazero, Credly | names; the stores show them this way |
| Store names | App Store, Google Play, TestFlight | Apple's and Google's brand rules |
| Technologies, services, tools | Flutter, React Native, Bloc, AWS Lambda, API Gateway, DynamoDB, GitHub Actions, MobSF, Cloudflare Workers | it's how developers write and search them, in every language |
| Official certificate titles | AWS Certified Solutions Architect – Associate (SAA-C03) | the credential's legal name; translate the sentence around it |
| Code, commands, regions | `eu-west-3`, `deploy.sh`, CI/CD | |

Arabic keeps these in Latin script inside the Arabic sentence (that is how Arab developers write), with the Arabic
connector attached: "منشور على App Store وGoogle Play".

## German (DACH tech market)
- **Job titles stay English**, as in German job ads: *Senior Mobile Engineer*, *Cloud & Platform Engineer*.
- **No du / Sie:** UI copy is phrased neutrally (*Sprache wählen*, *Womit beginnen?*) so it addresses nobody; it reads
  professional without the stiffness of *Sie*.
- **Project sections** use the standard German project-reference structure: **Ausgangslage → Umsetzung → Ergebnis**.
- **CV vocabulary:** *Lebenslauf*, *Berufserfahrung*, *Bildungsweg*, *Kenntnisse*, *Zertifizierungen*, "2025 – heute".
- Established anglicisms stay (*Tech-Stack*, *Build*, *Release*, *Deployment*, *Store-Review*, *Platform Engineering*,
  *Infrastructure as Code*); half-translations don't (~~re-plattformiert~~ → *auf eine neue Plattform migriert*).
- Typography: en dash with spaces ( – ) for breaks, „…" only inside running text.

## Arabic (MSA, as written in Gulf and Egyptian tech hiring)
- **Mobile = الجوّال** (understood across the region; *موبايل* is Egyptian-colloquial). **Cloud = الحوسبة السحابية**
  in titles, **السحابة** as the short lane name. **Platform = المنصّة**.
- **Titles:** مهندس تطبيقات جوّال أول · مهندس حوسبة سحابية ومنصّات.
- **Project sections:** **التحدّي ← الحلّ ← النتيجة** (the usual case-study pattern).
- **Technical terms:** Arabic first, English in parentheses where the English is what people search:
  تثبيت الشهادات (Certificate Pinning)، تشويش الكود (Obfuscation)، بلا خوادم (Serverless)، هندسة الموثوقية (SRE).
- No colloquialisms, no literal calques (~~لا تدهس~~, ~~بصمة اقتصادية~~). Prefer *تولّي مسؤولية* over *امتلاك* for "own".
- "present" = حتى الآن; "Both" = كلاهما.

## English
- "Google Play", never "Play Store". "Intrazero" as on its store listings.
- Short, active, first person in the project story ("I took both apps through store readiness…").

## Adding a project
Write `en` first, then `de` and `ar` following the tables above, and leave `review: { de: true, ar: true }` for the owner.
