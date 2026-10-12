/**
 * Checked against EasyPrivacy and uBlock's lists: no rule matches a bare
 * "/nav". Generic rules do match words like "track", "collect", and "pv".
 *
 * Lives outside index.ts because workerd treats every named export of the
 * main module as an entrypoint and refuses to start on a string export.
 */
export const PING_PATH = "/nav";
