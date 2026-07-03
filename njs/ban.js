/*
 * In-nginx scanner banner for Ephemeris.
 *
 * Counts bad-path requests per client IP in a shared-memory dict. Once an IP
 * makes `maxBadRequests` within `findtimeSeconds`, it is banned for
 * `banTimeSeconds` and blocked on EVERY path (via the auth_request check),
 * not just scanner paths.
 *
 * This is the portable, in-image layer: a fresh `docker run` self-protects
 * with no host setup. fail2ban (on the host) is the durable, kernel-level
 * layer that drops banned traffic at DOCKER-USER before it reaches nginx.
 * The two compose: njs's 444 responses are logged as 4xx, so fail2ban counts
 * the same hits and escalates. Turn this layer off with "enabled": false in
 * ban-config.json (then reload nginx) to run fail2ban alone.
 *
 * Caveats by design:
 *  - Bans are enforced at the HTTP layer (the TCP connection is accepted,
 *    then rejected). Kernel-level dropping is fail2ban's job.
 *  - State lives in shared memory and is cleared on container restart.
 *  - Counting is by bad PATH, never by request volume, so a classroom behind
 *    one NAT IP is never at risk (real users never hit scanner paths).
 *
 * Path list is kept roughly in sync with fail2ban/filter.conf by hand.
 */

import fs from 'fs';

var CONFIG_PATH = '/etc/nginx/njs/ban-config.json';
var DEFAULTS = {
  enabled: true,
  maxBadRequests: 3,
  findtimeSeconds: 600,
  banTimeSeconds: 86400,
};

function posInt(v, fallback) {
  var n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Read once at worker load. Editing the file takes effect on nginx reload.
function loadConfig() {
  try {
    var c = JSON.parse(fs.readFileSync(CONFIG_PATH));
    return {
      enabled: c.enabled !== false,
      maxBadRequests: posInt(c.maxBadRequests, DEFAULTS.maxBadRequests),
      findtimeSeconds: posInt(c.findtimeSeconds, DEFAULTS.findtimeSeconds),
      banTimeSeconds: posInt(c.banTimeSeconds, DEFAULTS.banTimeSeconds),
    };
  } catch (e) {
    return DEFAULTS;
  }
}

var cfg = loadConfig();

// Content handler for known scanner paths: count the hit, ban once the IP
// crosses the threshold, then close the connection with 444.
function scanner(r) {
  if (!cfg.enabled) {
    r.return(444);
    return;
  }
  var ip = r.remoteAddress;
  var n = ngx.shared.scanban.incr('c:' + ip, 1, 0, cfg.findtimeSeconds * 1000);
  if (n >= cfg.maxBadRequests) {
    ngx.shared.scanban.set('b:' + ip, 1, cfg.banTimeSeconds * 1000);
    r.error('ephemeris-ban: banned ' + ip + ' after ' + n + ' bad requests');
  }
  r.return(444);
}

// auth_request subrequest handler (inherited by every serving location):
// 403 if the IP is currently banned, 204 otherwise. This is what blocks a
// banned IP on all paths, matching fail2ban's block-everything behavior.
function check(r) {
  if (!cfg.enabled) {
    r.return(204);
    return;
  }
  if (ngx.shared.scanban.get('b:' + r.remoteAddress)) {
    r.return(403);
    return;
  }
  r.return(204);
}

export default { scanner, check };
