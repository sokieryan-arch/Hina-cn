import type { ObjectiveQuestion, ReadingPassage } from "../shared/practiceTypes";

const choice = (number: number, prompt: string, options: string[], answer: string, evidence: string, explanation: string): ObjectiveQuestion => ({
  id: `reading-${number}`,
  number,
  kind: "single",
  prompt,
  options,
  acceptedAnswers: [answer],
  evidence,
  explanation,
});

const text = (number: number, prompt: string, answers: string[], evidence: string, explanation: string): ObjectiveQuestion => ({
  id: `reading-${number}`,
  number,
  kind: "text",
  prompt,
  acceptedAnswers: answers,
  evidence,
  explanation,
});

const TFNG = ["True", "False", "Not given"];

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: "rooftop-wetlands",
    title: "Small wetlands above the street",
    subtitle: "Reading Passage 1 · Questions 1–13",
    paragraphs: [
      { label: "A", text: "On summer afternoons, the roof of Bellford's central library looks more like a shallow marsh than part of a public building. Beds of sedges sit in lightweight soil, while narrow channels guide rainwater between them. The roof was installed in 2018 to reduce pressure on drains during sudden storms. It can hold about 70 per cent of the rain from an ordinary summer shower and release the remainder slowly over the following day." },
      { label: "B", text: "The project differs from a conventional green roof. Most green roofs use drought-tolerant plants and are designed mainly to insulate the building. Bellford's roof includes permanently damp zones and several temporary pools. These features require stronger waterproofing, but they also support insects and birds that would not use a dry roof." },
      { label: "C", text: "At first, planners worried that mosquitoes would breed in the pools. The design team therefore made sure that water either moved through the channels or disappeared within forty-eight hours. A survey conducted over three summers found no greater number of mosquitoes on the roof than at street level. Dragonflies, which feed on mosquitoes, were recorded within the first year." },
      { label: "D", text: "The roof is monitored by low-cost sensors that measure water depth, soil temperature and the speed at which water leaves the site. Students at a nearby college helped to build the online dashboard. When one sensor began reporting impossible negative water levels, the dashboard made the fault visible within hours, allowing staff to replace it before the next storm." },
      { label: "E", text: "Not every result has been positive. During the first winter, strong winds removed soil from an exposed corner. Engineers added recycled timber screens rather than increasing the weight of the soil. Maintenance costs are still higher than for a simple metal roof, although the library uses volunteers for seasonal planting days." },
      { label: "F", text: "Three other public buildings are now considering similar roofs. City officials say the library should not be treated as a universal model: roof strength, rainfall and maintenance capacity must be assessed separately. Even so, the project has changed how local planners think about unused space above crowded streets." },
    ],
    questions: [
      choice(1, "The library roof was primarily created to reduce pressure on storm drains.", TFNG, "True", "The roof was installed ... to reduce pressure on drains during sudden storms.", "The stated main purpose matches the sentence."),
      choice(2, "The roof stores all rainfall from a normal summer shower.", TFNG, "False", "It can hold about 70 per cent of the rain from an ordinary summer shower.", "Seventy per cent is not all rainfall."),
      choice(3, "Conventional green roofs normally contain permanent pools.", TFNG, "False", "Bellford's roof differs from a conventional green roof and includes permanently damp zones and temporary pools.", "The pools are presented as a difference, not a normal feature."),
      choice(4, "More mosquitoes were found on the roof than at street level.", TFNG, "False", "A survey ... found no greater number of mosquitoes on the roof than at street level.", "The survey explicitly rejects the claim."),
      choice(5, "The college students were paid to create the dashboard.", TFNG, "Not given", "Students at a nearby college helped to build the online dashboard.", "Their payment is never mentioned."),
      text(6, "Complete the sentence with ONE WORD: Narrow ______ move rainwater between the planted beds.", ["channels"], "Narrow channels guide rainwater between them.", "The missing noun is copied directly from paragraph A."),
      text(7, "Complete the sentence with ONE WORD: Extra ______ was needed because some zones remain wet.", ["waterproofing"], "These features require stronger waterproofing.", "The wet design creates a waterproofing requirement."),
      text(8, "Complete the sentence with ONE WORD: ______ appeared during the roof's first year and eat mosquitoes.", ["dragonflies"], "Dragonflies, which feed on mosquitoes, were recorded within the first year.", "The insect and its role are stated together."),
      text(9, "Complete the sentence with TWO WORDS: Engineers used ______ ______ to protect an exposed corner from wind.", ["timber screens", "recycled timber"], "Engineers added recycled timber screens.", "Either permitted two-word phrase identifies the solution."),
      choice(10, "Which heading best matches paragraph C?", ["An expected problem that did not increase", "A cheaper source of building materials", "A plan to attract more visitors"], "An expected problem that did not increase", "Planners feared mosquitoes, but surveys found no increase.", "The paragraph follows a concern with evidence that it did not worsen."),
      choice(11, "Which heading best matches paragraph D?", ["Learning from a measurement failure", "Replacing volunteers with sensors", "Closing the roof during storms"], "Learning from a measurement failure", "An impossible reading exposed a faulty sensor before the next storm.", "The monitoring system made the fault useful and visible."),
      choice(12, "Which heading best matches paragraph E?", ["A completely maintenance-free design", "An adaptation after winter damage", "Why metal roofs are heavier"], "An adaptation after winter damage", "Wind removed soil, so engineers added recycled timber screens.", "The paragraph describes a problem and the resulting change."),
      choice(13, "What is the writer's final view of the project?", ["It should be copied without further study", "It is useful but local conditions still matter", "It has failed to influence city planning"], "It is useful but local conditions still matter", "Officials say it is not a universal model, but it changed local planning.", "The conclusion is positive but qualified."),
    ],
  },
  {
    id: "quiet-library",
    title: "When a library became less silent",
    subtitle: "Reading Passage 2 · Questions 14–26",
    paragraphs: [
      { label: "A", text: "For more than a century, silence was treated as the natural condition of a library. Yet surveys at Northbridge University showed that students did not all mean the same thing by 'quiet'. Some wanted absolute silence, while others were comfortable with keyboards, whispered questions or the low hum of ventilation. Complaints increased because these expectations occupied the same rooms." },
      { label: "B", text: "In 2022, the university divided its main library into three acoustic zones. The ground floor became a collaboration area, the middle floors allowed quiet individual work, and the top floor was reserved for silence. The zones were marked by colour and symbols rather than long lists of rules. Staff expected the change to reduce conflict, but they did not know whether students would respect boundaries without constant supervision." },
      { label: "C", text: "Researchers installed sound meters, but the devices stored only volume levels, not speech. This distinction mattered for privacy: no conversations could be reconstructed. The meters sent an average reading every five minutes. Researchers combined these figures with seat occupancy and anonymous weekly questionnaires." },
      { label: "D", text: "The results challenged a simple assumption. The collaboration floor was not always the loudest. At lunchtime, the quiet middle floors sometimes recorded sharper peaks when a chair scraped or a group arrived together. Students described these sudden noises as more distracting than the steady murmur downstairs. Predictability, the researchers concluded, could matter as much as volume." },
      { label: "E", text: "Behaviour also changed over time. During the first month, staff gave frequent reminders on the silent floor. By the third month, reminders had fallen by almost two thirds. Interviews suggested that regular users began correcting newcomers politely, creating a shared expectation without formal punishment." },
      { label: "F", text: "The trial had limits. It ran during one semester and did not include the examination period, when demand for silent seats is highest. The research team also noted that sound meters could not measure whether a noise was meaningful: a quiet phone conversation might disturb someone more than a louder but brief mechanical sound." },
      { label: "G", text: "Northbridge has kept the zones and added a live floor map showing seat availability, but it has resisted displaying live noise scores. Managers fear that a red warning could make students focus on sound and become less tolerant. Instead, the university treats zoning as a social agreement supported by design, not a competition for the lowest number." },
    ],
    questions: [
      choice(14, "Why did complaints increase before the trial?", ["The ventilation system became louder", "Different expectations shared the same spaces", "The library removed too many seats"], "Different expectations shared the same spaces", "Complaints increased because these expectations occupied the same rooms.", "The conflict came from incompatible definitions of quiet."),
      choice(15, "How were the three zones identified?", ["By colours and symbols", "By staff announcements", "By numbered tickets"], "By colours and symbols", "The zones were marked by colour and symbols.", "The design used visual markers instead of lengthy rules."),
      choice(16, "What privacy feature did the sound meters have?", ["They operated only at night", "They did not record reconstructable speech", "Students could switch them off"], "They did not record reconstructable speech", "The devices stored only volume levels, not speech.", "Only sound levels were retained."),
      text(17, "Complete with ONE WORD: The meters produced an average reading every five ______.", ["minutes"], "The meters sent an average reading every five minutes.", "The interval is explicitly stated."),
      text(18, "Complete with ONE WORD: Researchers compared sound data with seat occupancy and weekly ______.", ["questionnaires"], "Researchers combined these figures with seat occupancy and anonymous weekly questionnaires.", "The second research source was questionnaires."),
      choice(19, "The collaboration floor was consistently the loudest area.", TFNG, "False", "The collaboration floor was not always the loudest.", "The passage directly contradicts 'consistently'."),
      choice(20, "Students found sudden noises especially distracting.", TFNG, "True", "Students described these sudden noises as more distracting than the steady murmur downstairs.", "This is stated directly."),
      choice(21, "Staff reminders on the silent floor stopped completely by month three.", TFNG, "False", "Reminders had fallen by almost two thirds.", "They decreased, but did not stop completely."),
      choice(22, "Regular users sometimes asked newcomers to follow the zone expectations.", TFNG, "True", "Regular users began correcting newcomers politely.", "The statement paraphrases the interviews."),
      choice(23, "The trial included the university examination period.", TFNG, "False", "It did not include the examination period.", "The passage explicitly identifies this limitation."),
      choice(24, "Which factor did researchers conclude may be as important as volume?", ["Predictability", "Furniture colour", "Room temperature"], "Predictability", "Predictability ... could matter as much as volume.", "The conclusion is stated in paragraph D."),
      choice(25, "Why does the library avoid showing live noise scores?", ["The meters are too expensive", "Scores may reduce tolerance by drawing attention to sound", "Students requested more written rules"], "Scores may reduce tolerance by drawing attention to sound", "A red warning could make students focus on sound and become less tolerant.", "Managers worry that measurement could alter behaviour negatively."),
      choice(26, "What best describes the library's current approach?", ["Design supports a shared social agreement", "Machines automatically punish noisy users", "All floors now require complete silence"], "Design supports a shared social agreement", "The university treats zoning as a social agreement supported by design.", "The final sentence gives the governing principle."),
    ],
  },
  {
    id: "reef-sound",
    title: "Listening for a recovering reef",
    subtitle: "Reading Passage 3 · Questions 27–40",
    paragraphs: [
      { label: "A", text: "A coral reef is not silent. Healthy reefs produce a dense mixture of clicks, scrapes and low pulses made by fish, shrimp and other animals. Marine biologists increasingly use this soundscape as a source of information because visual surveys are expensive, weather-dependent and limited to what a diver can see during a short visit." },
      { label: "B", text: "Early acoustic studies counted how often particular sounds occurred. That approach proved difficult because the animal responsible for a sound was often unknown. Newer projects examine broader patterns, including the distribution of sound across frequencies and how activity changes between day and night. These patterns can be compared without naming every species." },
      { label: "C", text: "At Luma Bay, researchers placed waterproof recorders at twelve locations: four healthy reefs, four damaged reefs and four sites where coral fragments had recently been attached to frames. Each recorder collected two minutes of sound every quarter of an hour for six months. This schedule produced a large sample while conserving battery power." },
      { label: "D", text: "The restored sites did not immediately sound like healthy reefs. For the first eight weeks, their recordings remained closer to damaged areas. Then nighttime clicks became more varied, followed several weeks later by a wider range of daytime frequencies. Divers also observed more juvenile fish, but the acoustic shift appeared first." },
      { label: "E", text: "This sequence does not prove that sound attracted the fish. Both changes may have resulted from improving habitat. To test attraction directly, another team has played recordings of healthy reefs near new restoration sites. Some experiments reported more young fish near the speakers, although effects differed between species and locations." },
      { label: "F", text: "Automated analysis creates another challenge. Boat engines and heavy rain can dominate a recording. A system trained only on calm days may mistake weather for biological change. The Luma Bay team therefore labelled a small but varied set of recordings by hand and included stormy periods in the training data." },
      { label: "G", text: "Acoustic monitoring will not replace divers. A recorder cannot show whether coral is diseased or whether fishing line is damaging a colony. Its value lies in continuous coverage: it can reveal when a site changes and help teams decide where a closer inspection is needed." },
      { label: "H", text: "The next step is to agree on common recording and reporting methods. At present, projects use different microphones, sampling schedules and measures of acoustic diversity. Until these differences are reduced, comparing one reef with another will remain uncertain. Sound may become a powerful early-warning tool, but only if researchers learn to listen in compatible ways." },
    ],
    questions: [
      choice(27, "What advantage of acoustic monitoring is emphasised in paragraph A?", ["It identifies every animal species", "It can collect information beyond short visual visits", "It works only in perfect weather"], "It can collect information beyond short visual visits", "Visual surveys are limited to what a diver can see during a short visit.", "Sound recording can extend observation through time."),
      choice(28, "Why did counting individual sound types prove difficult?", ["Recorders had insufficient battery power", "The source animal was often unknown", "Healthy reefs produced no clicks"], "The source animal was often unknown", "The animal responsible for a sound was often unknown.", "This prevented reliable sound-by-sound identification."),
      text(29, "Complete with ONE WORD: Modern projects examine sound distribution across different ______.", ["frequencies"], "Newer projects examine broader patterns, including the distribution of sound across frequencies.", "The technical dimension is frequency."),
      text(30, "Complete with ONE WORD: At Luma Bay, recorders operated for six ______.", ["months"], "Each recorder ... for six months.", "The study duration is stated directly."),
      text(31, "Complete with TWO WORDS: Sampling briefly every fifteen minutes helped preserve ______ ______.", ["battery power"], "This schedule produced a large sample while conserving battery power.", "The intermittent schedule reduced energy use."),
      choice(32, "Which change was recorded first at the restoration sites?", ["More juvenile fish seen by divers", "A greater variety of nighttime clicks", "A wider range of daytime frequencies"], "A greater variety of nighttime clicks", "Nighttime clicks became more varied, followed ... by a wider range of daytime frequencies.", "The acoustic nighttime change came first."),
      choice(33, "The Luma Bay results prove that reef sounds attracted young fish.", TFNG, "False", "This sequence does not prove that sound attracted the fish.", "The writer explicitly warns against that causal conclusion."),
      choice(34, "Playback experiments produced identical results for all fish species.", TFNG, "False", "Effects differed between species and locations.", "The effects were not identical."),
      choice(35, "The hand-labelled recordings included periods of bad weather.", TFNG, "True", "The team ... included stormy periods in the training data.", "Storm conditions were deliberately represented."),
      choice(36, "The researchers published the exact cost of each waterproof recorder.", TFNG, "Not given", "The passage describes recorder placement and sampling but gives no price.", "No cost information appears."),
      choice(37, "Why can automated analysis misread a reef recording?", ["Divers remove the microphones", "Non-biological sounds may dominate", "Fish stop making sounds at night"], "Non-biological sounds may dominate", "Boat engines and heavy rain can dominate a recording.", "Environmental and human noise can overwhelm biological signals."),
      choice(38, "According to paragraph G, what should trigger a diver inspection?", ["A change detected by continuous recording", "Every two-minute audio sample", "A reduction in microphone prices"], "A change detected by continuous recording", "It can reveal when a site changes and help teams decide where a closer inspection is needed.", "Recorders guide, rather than replace, inspection."),
      choice(39, "What currently makes comparisons between reef projects uncertain?", ["Different recording and reporting methods", "A total absence of nighttime data", "A ban on underwater microphones"], "Different recording and reporting methods", "Projects use different microphones, sampling schedules and measures.", "Inconsistent methods limit cross-site comparison."),
      choice(40, "Which statement best captures the writer's conclusion?", ["Acoustic monitoring is already a complete replacement for divers", "Reef sound has little scientific value", "Acoustic monitoring is promising but needs compatible standards"], "Acoustic monitoring is promising but needs compatible standards", "Sound may become a powerful early-warning tool, but only if researchers learn to listen in compatible ways.", "The conclusion balances potential with a standardisation requirement."),
    ],
  },
];

export const READING_QUESTIONS = READING_PASSAGES.flatMap((passage) => passage.questions);


