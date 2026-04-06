import nlp from "compromise";
import { AppLogger } from "../../logger/winston.logger";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PayloadExtractor{

  constructor(
    private readonly logger:AppLogger
  ) { };

  private extractCoreNouns(sentence: string):string[] {
    const doc = nlp(sentence);

    const pronouns = new Set([
      "i","you","he","she","it","we","they",
      "me","him","her","us","them",
      "my","your","his","their","our","its"
    ]);

    return doc
      .match('#Noun')
      .not('#Pronoun')
      .out('array')
      .map(word => word.trim().toLowerCase())
      .filter(word => word && !pronouns.has(word))
  }

  private singularizeNouns(nouns: string[]): string[] {
    const allNouns = nouns.map((noun) => {
      const singular = nlp(noun).nouns().toSingular().out("text");
      return singular;
    });

    return allNouns;
  }

  extractPayload(text: string):string[] {
    const nouns = this.extractCoreNouns(text);
    // return this.singularizeNouns(nouns);
    return nouns;

  }

  private tokenize(text:string):string[] {

    const cleanText = text.toLocaleLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    return Array.from(new Set(cleanText));

  }





}
