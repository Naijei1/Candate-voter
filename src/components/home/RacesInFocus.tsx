import Image from "next/image";
import { thumbnail } from "@/lib/site/thumbnail";
import stories from "../../../data/ky-races-in-focus.json";
import { raceCardTitle } from "@/lib/site/candidate-cards";
import { KY_SENATORS } from "@/lib/site/ky-statewide";
import { portraitFor } from "@/lib/site/stances";

export function RacesInFocus() {
  return (
    <section className="focus-band" aria-labelledby="focus-heading">
      <div className="wrap">
        <h2 id="focus-heading">Races in focus</h2>
        <ul className="focus-stories">
          {stories.map((story) => {
            const photo = portraitFor(story.portrait) ?? KY_SENATORS.find((senator) => senator.id === story.portrait)?.photo;
            return (
              <li key={story.raceId}>
                <div className="focus-story">
                  {photo && <Image unoptimized src={thumbnail(photo.src)} width="88" height="110" alt={story.person} loading="lazy" />}
                  <div>
                    <h3><a href={`/races/${story.raceId}`}>{raceCardTitle(story.raceId)}</a></h3>
                    <p>{story.reason}</p>
                  </div>
                </div>
                <div className="focus-sources">
                  <a href={story.sourceUrl}>House Clerk</a>
                  {photo && <a href={photo.sourceUrl} aria-label={`Photo credit for ${story.person}`}>Photo credit</a>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
