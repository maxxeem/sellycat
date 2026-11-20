/**
 * Landing page copy (apex "/"), one file per block so the blocks can be edited independently.
 * Composed into `t.site` of both dictionaries.
 */
import * as audiences from "./audiences";
import * as bands from "./bands";
import * as core from "./core";
import * as features from "./features";
import * as scan from "./scan";
import * as steps from "./steps";
import * as tour from "./tour";

export const siteEn = { ...core.en, bands: bands.en, tour: tour.en, steps: steps.en, features: features.en, scan: scan.en, audiences: audiences.en };
export const siteDe = { ...core.de, bands: bands.de, tour: tour.de, steps: steps.de, features: features.de, scan: scan.de, audiences: audiences.de };
