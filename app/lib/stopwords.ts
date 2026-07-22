export type TextLanguage = "en" | "ru" | "uk";

export const DEFAULT_STOPWORD_TEXT:Record<TextLanguage,string> = {
  en:"a, an, and, are, as, at, be, been, by, for, from, had, has, have, he, her, hers, him, his, i, if, in, into, is, it, its, me, my, of, on, or, our, ours, she, so, that, the, their, them, they, this, to, us, was, we, were, what, when, where, which, who, why, will, with, you, your, yours",
  ru:"а, без, бы, был, была, были, быть, в, вам, вас, вы, где, да, для, до, его, ее, ей, если, есть, еще, за, и, из, или, их, как, к, когда, ли, меня, мне, мы, на, над, не, него, нее, нет, ни, но, о, он, она, они, от, по, под, при, с, со, так, то, ты, у, уже, что, чтобы, это, я",
  uk:"а, або, але, б, без, би, був, була, були, бути, в, вам, вас, ви, від, він, вона, вони, все, всіх, де, до, за, з, зі, й, і, із, його, її, їх, коли, ми, мене, мені, мною, на, над, не, ні, ним, нього, неї, о, по, про, під, при, та, так, ти, то, у, усе, це, цей, ця, ці, що, щоб, як",
};

export function parseStopwordText(value:string){
  return [...new Set(value.toLowerCase().split(/[\s,;]+/).map(word=>word.trim()).filter(Boolean))];
}

export const DEFAULT_STOPWORD_LISTS:Record<TextLanguage,string[]> = {
  en:parseStopwordText(DEFAULT_STOPWORD_TEXT.en),
  ru:parseStopwordText(DEFAULT_STOPWORD_TEXT.ru),
  uk:parseStopwordText(DEFAULT_STOPWORD_TEXT.uk),
};
