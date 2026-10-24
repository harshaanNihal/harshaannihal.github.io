// Sorts the network a visit came from (Cloudflare's request.cf.asn and asOrganization) into three kinds. Cloud
// and hosting networks are mostly bots. Home and mobile internet providers are reported without their name.
// Everything else counts as a business or institution, and its name is shown in the digest. These lists are
// heuristics: extend them when the digest shows a network in the wrong kind.

export type NetworkKind = 'cloud' | 'home' | 'business';

/* Hosting and cloud networks by number. Some also carry office traffic (Microsoft, Google); those visits count
   only when they show human signs (see the digest). */
const cloudAsns = new Set([
  16509, 14618, 8987, // Amazon
  15169, 396982, 19527, // Google
  8075, // Microsoft
  14061, // DigitalOcean
  24940, // Hetzner
  16276, // OVH
  63949, // Linode (Akamai)
  20473, // Vultr
  31898, // Oracle
  45102, // Alibaba
  132203, // Tencent
  51167, // Contabo
  12876, // Scaleway
  9009, // M247
  60068, 212238, // Datacamp
  36352, // ColoCrossing
  60781, // Leaseweb
]);

const cloudNames = /amazon|aws|google cloud|microsoft|azure|digitalocean|hetzner|ovh|linode|akamai|vultr|choopa|oracle|alibaba|tencent|contabo|scaleway|leaseweb|m247|datacamp|colocrossing|hosting|server|cloud|data ?cent(er|re)|\bvps\b/i;

const homeNames = /jio|bharti|airtel|vodafone|\bidea\b|bsnl|act fibernet|hathway|tata (play|sky|tele)|comcast|charter|spectrum|verizon|at&t|t-mobile|sprint|\bcox\b|centurylink|lumen|frontier|british telecom|\bbt\b|sky broadband|virgin media|talktalk|telekom|orange|free sas|\bsfr\b|bouygues|telefonica|movistar|\bvivo\b|claro|telstra|optus|rogers|bell canada|telus|\bshaw\b|\bntt\b|kddi|softbank|singtel|starhub|\bpldt\b|viettel|\bmtn\b|safaricom|etisalat|turk ?telekom|turkcell|vodacom|telenor|telia|swisscom|\bkpn\b|ziggo|proximus|liberty global|tele2|\bthree\b|\bo2\b|broadband|telecom|communications|mobile|wireless|cable|\bisp\b/i;

export function networkKind(asn: number | null | undefined, name: string | null | undefined): NetworkKind {
  if (asn && cloudAsns.has(asn)) return 'cloud';
  if (name && cloudNames.test(name)) return 'cloud';
  if (!name || homeNames.test(name)) return 'home';
  return 'business';
}
