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

    const nouns = doc.nouns().json();

    return nouns.map(noun => {
      // Get the last word (the actual noun, after adjectives)
      const words = noun.singular.split(' ');
      return {
        original: noun.text,      // "white roses"
        singular: words[words.length - 1],  // "rose"
        plural: noun.text.split(' ').pop()  // "roses"
      };
    });

  }

}
