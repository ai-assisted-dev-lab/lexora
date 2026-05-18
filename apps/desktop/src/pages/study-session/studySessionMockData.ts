import type { MockStudyItem } from "./types";

export const mockSessionItems: MockStudyItem[] = [
  {
    answer: "trình bày chi tiết",
    choices: [],
    example: "Could you elaborate on your answer with a personal example?",
    id: "elaborate-flashcard",
    mode: "Flashcard",
    prompt: "elaborate",
  },
  {
    answer: "quan trọng, thiết yếu",
    choices: [
      "quan trọng, thiết yếu",
      "ngẫu nhiên, không chắc chắn",
      "dễ đoán, lặp lại",
      "thân mật, suồng sã",
    ],
    example: "A clear structure is crucial in a long speaking response.",
    id: "crucial-choice",
    mode: "Multiple Choice",
    prompt: "crucial",
  },
  {
    answer: "from my perspective",
    choices: [],
    example: "From my perspective, public transport should be improved first.",
    id: "perspective-type",
    mode: "Type Answer",
    prompt: "Theo quan điểm của tôi",
  },
];
