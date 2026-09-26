import type { WritingTaskType } from "../shared/practiceTypes";

export interface WritingCalibrationBenchmark {
  id: string;
  taskType: WritingTaskType;
  expectedBand: 4 | 5 | 6 | 7 | 8;
  response: string;
  rationale: string;
}

const TASK_1_RESPONSES: WritingCalibrationBenchmark[] = [
  {
    id: "task1-band-4",
    taskType: "task1",
    expectedBand: 4,
    response: "The graph is about museums from 2019 to 2023. Maritime is 420 and then 260. Design is 280. Natural History is more in first year. In 2023 Maritime is 620. All museum changed and people visit them. Maritime go up and Design also go up, but Natural History is not very change.",
    rationale: "Lists isolated figures, lacks a clear overview, and contains frequent grammatical errors.",
  },
  {
    id: "task1-band-5",
    taskType: "task1",
    expectedBand: 5,
    response: "The line graph compares visitors to three museums between 2019 and 2023. Overall, Maritime and Design became more popular, while Natural History changed less. All three fell in 2020. Maritime dropped from 420 thousand to 260 thousand, then rose to 620 thousand in 2023. Design followed a similar pattern and finished at 540 thousand. Natural History began highest, at 510 thousand, but ended at only 410 thousand.",
    rationale: "Covers the main pattern but comparisons and language remain limited.",
  },
  {
    id: "task1-band-6",
    taskType: "task1",
    expectedBand: 6,
    response: "The graph illustrates changes in annual attendance at three Bellford museums from 2019 to 2023. Overall, visitor numbers fell sharply in 2020 before recovering. The Maritime and Design museums then grew much faster than Natural History. Maritime attendance declined from 420,000 to 260,000, but subsequently climbed to 620,000, the highest final figure. Design showed a comparable rise from 240,000 in 2020 to 540,000 in 2023. By contrast, Natural History started at 510,000 and recovered more modestly to 410,000 after its 2020 fall.",
    rationale: "Clear overview and accurate key comparisons with some controlled complex language.",
  },
  {
    id: "task1-band-7",
    taskType: "task1",
    expectedBand: 7,
    response: "The line graph compares annual attendance, in thousands, at Bellford's Maritime, Design and Natural History museums between 2019 and 2023. Overall, all three experienced a pronounced decline in 2020. Thereafter, Maritime and Design attendance rose strongly and both overtook Natural History, whose recovery was comparatively modest. Natural History was initially the most visited site, attracting 510,000 people in 2019, compared with 420,000 at Maritime and 280,000 at Design. Following the common downturn, Maritime recorded the sharpest growth, more than doubling from 260,000 to 620,000. Design followed a similar trajectory, reaching 540,000, whereas Natural History increased gradually from 310,000 to 410,000.",
    rationale: "Selects and groups key features well, with precise comparisons and generally flexible language.",
  },
  {
    id: "task1-band-8",
    taskType: "task1",
    expectedBand: 8,
    response: "The line graph charts annual visitor numbers, measured in thousands, for three museums in Bellford over the five years from 2019. Overall, attendance at every museum contracted markedly in 2020; however, the subsequent rebound was far stronger at the Maritime and Design museums than at Natural History. Consequently, the latter moved from first to last place. In 2019, Natural History led with 510,000 visitors, 90,000 more than Maritime and 230,000 above Design. The following year these totals fell to 310,000, 260,000 and 240,000 respectively. Maritime then rose consistently to 620,000 by 2023, while Design almost matched this pace, ending at 540,000. Natural History recovered only gradually, reaching 410,000, which was still 100,000 below its initial figure.",
    rationale: "Presents a concise overview, perceptive grouping, exact comparisons, and highly controlled language.",
  },
];

const TASK_2_RESPONSES: WritingCalibrationBenchmark[] = [
  {
    id: "task2-band-4",
    taskType: "task2",
    expectedBand: 4,
    response: "Working home is good and bad. People no travel so have time. It is good for family. But people alone and cannot talk office. Company can use computer. I think advantage is more because save time. In conclusion work home is useful but sometimes bad for workers and company.",
    rationale: "A relevant position is present, but ideas are barely developed and errors are frequent.",
  },
  {
    id: "task2-band-5",
    taskType: "task2",
    expectedBand: 5,
    response: "Working from home has become popular and it has both advantages and disadvantages. The main advantage is that employees do not need to commute, so they save time and money. They can also spend more time with their family. However, home workers may feel lonely and communication can be difficult. For example, online meetings are not always as effective as speaking in an office. I believe the advantages are greater because companies can arrange some office days to solve these problems. Therefore, remote work is generally a positive development.",
    rationale: "Addresses the question with a clear position, though development and language range are limited.",
  },
  {
    id: "task2-band-6",
    taskType: "task2",
    expectedBand: 6,
    response: "The spread of remote work has changed how many organisations operate. Although this arrangement can reduce teamwork and leave employees isolated, I believe its advantages are greater because it saves time and widens access to employment. Commuting can consume several hours each week. Working at home allows employees to use this time for rest or family responsibilities, which may improve their concentration. Companies can also recruit people who live outside major cities. Nevertheless, colleagues may exchange ideas less naturally online, and inexperienced staff can receive less informal support. These problems are important, but regular office days and clear communication routines can reduce them. Overall, remote work offers substantial practical benefits when it is managed carefully.",
    rationale: "Develops both sides coherently with an adequate range of vocabulary and structures.",
  },
  {
    id: "task2-band-7",
    taskType: "task2",
    expectedBand: 7,
    response: "As remote work becomes routine, employers must decide whether its flexibility outweighs the loss of a shared workplace. In my view, the benefits are greater, provided that organisations deliberately protect collaboration. The clearest advantage is the removal of the daily commute. Employees gain time for rest and family life, while businesses can recruit beyond expensive urban centres. This broader labour market can also benefit people with disabilities or caring responsibilities. The principal drawback is weaker informal communication. New employees may struggle to learn from colleagues, and creative problems can take longer to solve through scheduled calls. Yet this is not an unavoidable consequence of remote work. Mentoring, shared online spaces and periodic office days can preserve contact without removing flexibility. Remote work therefore creates manageable challenges, whereas its gains in time, access and autonomy are substantial.",
    rationale: "A well-developed position, logical progression, and flexible language are sustained throughout.",
  },
  {
    id: "task2-band-8",
    taskType: "task2",
    expectedBand: 8,
    response: "The rapid normalisation of home working has prompted concern that convenience is being purchased at the expense of collaboration. Although that risk is genuine, the advantages of remote work outweigh its disadvantages when organisations treat flexibility as a designed system rather than an absence from the office. Eliminating a compulsory commute returns both time and autonomy to employees. Parents and carers can organise responsibilities more efficiently, while firms gain access to specialists who would not relocate. These benefits extend beyond personal convenience: fewer journeys can ease congestion and allow regional communities to share in high-value employment. Remote arrangements can, admittedly, weaken spontaneous learning and social connection. Junior staff may receive less incidental guidance, and complex disagreements are harder to resolve in text. However, these weaknesses call for structured mentoring, purposeful in-person sessions and reliable communication norms, not a wholesale return to daily attendance. Since such measures can preserve collaboration while retaining wider access and reduced travel, the balance remains decisively in favour of remote work.",
    rationale: "Ideas are fully developed and precisely connected, with wide, natural and consistently controlled language.",
  },
];

export const WRITING_CALIBRATION_BENCHMARKS = [...TASK_1_RESPONSES, ...TASK_2_RESPONSES];

const BAND_ANCHORS: Record<WritingTaskType, string[]> = {
  task1: [
    "Band 4: isolated details, no reliable overview, and frequent language breakdowns.",
    "Band 5: a basic overview and some key data, but selection, comparison, or control is limited.",
    "Band 6: a clear overview with relevant key features and generally accurate comparisons.",
    "Band 7: well-selected and grouped features, precise comparisons, and flexible controlled language.",
    "Band 8: a concise, perceptive overview with skilful synthesis and only rare language lapses.",
  ],
  task2: [
    "Band 4: a position may be visible, but ideas are minimal and language breakdowns are frequent.",
    "Band 5: the question is addressed with limited development and a restricted language range.",
    "Band 6: a clear position and relevant developed ideas are expressed with adequate control.",
    "Band 7: the position is well developed, progression is logical, and language is flexible and controlled.",
    "Band 8: ideas are fully extended and precisely connected with wide, natural, highly controlled language.",
  ],
};

export function writingCalibrationAnchors(taskType: WritingTaskType) {
  return BAND_ANCHORS[taskType].join("\n");
}

export function validateWritingCalibrationResults(taskType: WritingTaskType, results: Array<{ id: string; estimatedBand: number }>) {
  const benchmarks = WRITING_CALIBRATION_BENCHMARKS.filter((item) => item.taskType === taskType);
  const byId = new Map(results.map((result) => [result.id, result.estimatedBand]));
  const scores = benchmarks.map((benchmark) => {
    const score = byId.get(benchmark.id);
    if (typeof score !== "number") throw new Error(`Missing calibration result for ${benchmark.id}.`);
    if (Math.abs(score - benchmark.expectedBand) > 1) throw new Error(`${benchmark.id} drifted outside its one-band tolerance.`);
    return score;
  });
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] < scores[index - 1]) throw new Error(`${taskType} calibration scores are not monotonic.`);
  }
  return true;
}


