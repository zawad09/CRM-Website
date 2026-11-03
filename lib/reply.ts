import type { EnquiryInterest, EnquiryLanguage } from "./types";

function greeting(name: string | null, banglish: boolean): string {
  if (name && banglish) return `${name} bhai/apa,`;
  if (name) return `Hi ${name},`;
  return banglish ? "Assalamualaikum," : "Hello,";
}

function programme(interest: EnquiryInterest | null, banglish: boolean): string {
  if (interest === "fellowship") return banglish ? "fellowship" : "fellowship";
  if (interest === "corporate_training") {
    return banglish ? "corporate training" : "corporate training";
  }
  return "bootcamp";
}

export function heuristicReply(input: {
  message: string;
  name?: string | null;
  interest?: EnquiryInterest | null;
  language?: EnquiryLanguage;
  target: "english" | "banglish";
  intent?: string | null;
}): string {
  const banglish = input.target === "banglish";
  const hi = greeting(input.name ?? null, banglish);
  const prog = programme(input.interest ?? null, banglish);
  const intent = input.intent ?? "general";

  if (banglish) {
    const ask =
      intent === "price_question"
        ? `BIAI ${prog} er fee structure ar next batch er details share korte pari - exact figure message e guess korbo na.`
        : intent === "schedule"
          ? `${prog} er upcoming batch timing confirm kore pathacchi. Weekend naki weekday, eita janale better match korte pari.`
          : intent === "scholarship"
            ? `Scholarship/waiver er current options check kore janabo. Meanwhile aapnar background (student/job) ek line e likhben?`
            : intent === "ready_to_pay"
              ? `Enroll korte chaile payment steps ar required documents share korte pari.`
              : `BIAI te ${prog} niye interest er jonno thanks. Apnar question ta clearly bujhte chaichi.`;
    return `${hi}\n${ask}\nApni ki fee, schedule, naki apply process age jante chan?\n- BIAI team`;
  }

  const ask =
    intent === "price_question"
      ? `I can share the current ${prog} fee range and the next intake — I will not guess numbers here.`
      : intent === "schedule"
        ? `I will send the ${prog} batch calendar. Weekday or weekend — which works better?`
        : intent === "scholarship"
          ? `I can check current scholarship or waiver options. Could you share whether you are a student or working?`
          : intent === "ready_to_pay"
            ? `Happy to walk you through enrolment and payment for the ${prog}.`
            : `Thanks for writing to BIAI about the ${prog}. I want to make sure we answer the right thing first.`;
  return `${hi}\n${ask}\nWould you like fees, schedule, or how to apply next?\n- BIAI team`;
}
