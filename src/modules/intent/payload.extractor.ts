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

  private singularizeNouns(nouns: string[]):string[] {
    nouns.map(
      (noun) => {
        nlp(noun).nouns().toSingular().out("text")
      }
    )

    return nouns
  }

  extractPayload(text: string):string[] {
    const nouns = this.extractCoreNouns(text);
    return this.singularizeNouns(nouns);
  }





}
