import type { WritingPrompt, WritingTask1Prompt, WritingTask2Prompt } from "../shared/practiceTypes";

export const WRITING_TASK_1_PROMPTS: WritingTask1Prompt[] = [
  {
    id: "task1-museum-visitors",
    taskType: "task1",
    topic: "Line graph",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The line graph below shows annual visitor numbers for three museums in Bellford between 2019 and 2023. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      kind: "line",
      title: "Annual visitors to Bellford museums",
      unit: "thousands",
      labels: ["2019", "2020", "2021", "2022", "2023"],
      series: [
        { name: "Maritime", values: [420, 260, 390, 510, 620] },
        { name: "Design", values: [280, 240, 330, 460, 540] },
        { name: "Natural History", values: [510, 310, 350, 370, 410] },
      ],
    },
    sourceFacts: [
      "The unit is thousands of visitors.",
      "Maritime Museum: 420 in 2019, 260 in 2020, 390 in 2021, 510 in 2022, and 620 in 2023.",
      "Design Museum: 280 in 2019, 240 in 2020, 330 in 2021, 460 in 2022, and 540 in 2023.",
      "Natural History Museum: 510 in 2019, 310 in 2020, 350 in 2021, 370 in 2022, and 410 in 2023.",
    ],
  },
  {
    id: "task1-household-spending",
    taskType: "task1",
    topic: "Bar chart",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The bar chart below compares the percentage of household income spent on three categories in four countries in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      kind: "bar",
      title: "Share of household income by category, 2025",
      unit: "%",
      labels: ["Canada", "Japan", "Spain", "Brazil"],
      series: [
        { name: "Housing", values: [32, 28, 35, 30] },
        { name: "Food", values: [14, 19, 17, 24] },
        { name: "Transport", values: [16, 12, 11, 15] },
      ],
    },
    sourceFacts: [
      "The figures are percentages of household income in 2025.",
      "Canada: housing 32%, food 14%, transport 16%.",
      "Japan: housing 28%, food 19%, transport 12%.",
      "Spain: housing 35%, food 17%, transport 11%.",
      "Brazil: housing 30%, food 24%, transport 15%.",
    ],
  },
  {
    id: "task1-energy-mix",
    taskType: "task1",
    topic: "Pie charts",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The charts below show the sources of electricity in Northland in 2000 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      kind: "pie",
      title: "Electricity generation in Northland",
      sets: [
        { label: "2000", values: [{ name: "Coal", value: 46 }, { name: "Gas", value: 28 }, { name: "Hydro", value: 18 }, { name: "Wind and solar", value: 8 }] },
        { label: "2025", values: [{ name: "Coal", value: 18 }, { name: "Gas", value: 24 }, { name: "Hydro", value: 22 }, { name: "Wind and solar", value: 36 }] },
      ],
    },
    sourceFacts: [
      "In 2000, coal supplied 46%, gas 28%, hydro 18%, and wind and solar 8%.",
      "In 2025, coal supplied 18%, gas 24%, hydro 22%, and wind and solar 36%.",
    ],
  },
  {
    id: "task1-graduate-subjects",
    taskType: "task1",
    topic: "Table",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The table below shows the number of graduates from a university in four subject areas in 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      kind: "table",
      title: "University graduates by subject",
      columns: ["2015", "2025"],
      rows: [
        { label: "Business", values: [1240, 1680] },
        { label: "Engineering", values: [860, 1410] },
        { label: "Arts", values: [1120, 980] },
        { label: "Health sciences", values: [740, 1260] },
      ],
      unit: "graduates",
    },
    sourceFacts: [
      "Business graduates increased from 1,240 in 2015 to 1,680 in 2025.",
      "Engineering graduates increased from 860 to 1,410.",
      "Arts graduates decreased from 1,120 to 980.",
      "Health sciences graduates increased from 740 to 1,260.",
    ],
  },
  {
    id: "task1-riverside-park",
    taskType: "task1",
    topic: "Maps",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The maps below show Riverside Park in 2010 and after its redevelopment in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visual: {
      kind: "map",
      title: "Riverside Park redevelopment",
      panels: [
        {
          label: "2010",
          features: [
            { label: "Woodland", x: 5, y: 8, width: 32, height: 34, tone: "green" },
            { label: "Open field", x: 42, y: 8, width: 52, height: 34, tone: "neutral" },
            { label: "Car park", x: 5, y: 50, width: 28, height: 38, tone: "amber" },
            { label: "Playground", x: 38, y: 50, width: 28, height: 38, tone: "rose" },
            { label: "River", x: 72, y: 48, width: 22, height: 40, tone: "blue" },
          ],
        },
        {
          label: "2025",
          features: [
            { label: "Woodland", x: 5, y: 8, width: 25, height: 34, tone: "green" },
            { label: "Cafe", x: 35, y: 8, width: 22, height: 25, tone: "amber" },
            { label: "Sports area", x: 62, y: 8, width: 32, height: 34, tone: "rose" },
            { label: "Underground parking", x: 5, y: 50, width: 30, height: 38, tone: "neutral" },
            { label: "Larger playground", x: 40, y: 50, width: 27, height: 38, tone: "rose" },
            { label: "River walk", x: 72, y: 48, width: 22, height: 40, tone: "blue" },
          ],
        },
      ],
    },
    sourceFacts: [
      "In 2010 the park contained woodland, an open field, a surface car park, a playground, and a river.",
      "By 2025 the open field had been replaced by a cafe and sports area.",
      "The surface car park became underground parking.",
      "The playground was enlarged, a river walk was added, and the woodland became smaller.",
    ],
  },
  {
    id: "task1-coffee-process",
    taskType: "task1",
    topic: "Process",
    minimumWords: 150,
    durationMinutes: 20,
    question: "The diagram below shows how roasted coffee is produced from harvested coffee cherries. Summarise the information by selecting and reporting the main features.",
    visual: {
      kind: "process",
      title: "Production of roasted coffee",
      steps: [
        { title: "Harvest", detail: "Ripe cherries are picked" },
        { title: "Wash", detail: "Fruit and impurities are removed" },
        { title: "Dry", detail: "Beans dry in the sun" },
        { title: "Hull", detail: "Outer layers are removed" },
        { title: "Roast", detail: "Green beans are heated" },
        { title: "Cool and pack", detail: "Roasted beans are cooled and sealed" },
      ],
    },
    sourceFacts: [
      "There are six stages from harvesting to packing.",
      "Ripe coffee cherries are harvested and then washed.",
      "The beans are dried in the sun before their outer layers are removed.",
      "The green beans are roasted, cooled, and finally packed in sealed bags.",
    ],
  },
];

export const WRITING_TASK_2_PROMPTS: WritingTask2Prompt[] = [
  {
    id: "task2-city-green-space",
    taskType: "task2",
    topic: "Cities",
    minimumWords: 250,
    durationMinutes: 40,
    question: "Some people believe cities should use more public land for parks and gardens rather than for new housing. To what extent do you agree or disagree?",
  },
  {
    id: "task2-remote-work",
    taskType: "task2",
    topic: "Work",
    minimumWords: 250,
    durationMinutes: 40,
    question: "Working from home is becoming common in many countries. Do the advantages of this development outweigh the disadvantages?",
  },
  {
    id: "task2-school-life-skills",
    taskType: "task2",
    topic: "Education",
    minimumWords: 250,
    durationMinutes: 40,
    question: "Schools should spend more time teaching practical life skills and less time teaching traditional academic subjects. Discuss both views and give your own opinion.",
  },
  {
    id: "task2-tourism-local-culture",
    taskType: "task2",
    topic: "Culture",
    minimumWords: 250,
    durationMinutes: 40,
    question: "International tourism can sometimes cause local traditions to become less authentic. What problems can this create, and what measures could reduce them?",
  },
  {
    id: "task2-public-transport",
    taskType: "task2",
    topic: "Transport",
    minimumWords: 250,
    durationMinutes: 40,
    question: "Some people think public transport should be free in large cities. What are the advantages and disadvantages of this policy?",
  },
  {
    id: "task2-technology-older-people",
    taskType: "task2",
    topic: "Technology",
    minimumWords: 250,
    durationMinutes: 40,
    question: "Many older people find it difficult to use modern technology. Why does this happen, and how can they be encouraged to use it?",
  },
];

export function findWritingTask2Prompt(questionId: string) {
  return WRITING_TASK_2_PROMPTS.find((prompt) => prompt.id === questionId) || null;
}

export const WRITING_PROMPTS: WritingPrompt[] = [...WRITING_TASK_1_PROMPTS, ...WRITING_TASK_2_PROMPTS];

export function findWritingPrompt(questionId: string) {
  return WRITING_PROMPTS.find((prompt) => prompt.id === questionId) || null;
}


