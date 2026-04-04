import nlp from "compromise";
import { AppLogger } from "../../logger/winston.logger";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PayloadExtractor{

  constructor(
    private readonly logger:AppLogger
  ) { };

   async extractCoreNouns(sentence:string) {
    const doc = nlp(sentence);

    const nouns = doc.nouns().json() as any[];

    return nouns
      .filter(noun => noun && noun.text)
      .map(noun => {
        const singularPhrase = noun.singular || noun.text;
        // Extract only the last word to remove adjectives
        const words = singularPhrase.trim().split(' ');
        return words[words.length - 1];
      })
      .filter(word => word && word.length > 0);
  }

}
