import nlp from "compromise";
import { AppLogger } from "../../logger/winston.logger";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PayloadExtractor{

  constructor(
    private readonly logger:AppLogger
  ) { };

  extractCoreNouns(sentence: string) {
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

  singularizeNouns(nouns: string[]) {

  }



}
