// Paddock 3D · génère tous les fichiers de données de l'application à partir de F1DB (CC BY 4.0).
// Usage : node scripts/build.mjs <chemin f1db.json> <dossier de sortie>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const [,, SRC = '_f1db/f1db.json', OUT = 'data'] = process.argv; mkdirSync(OUT, { recursive: true });
const F = JSON.parse(readFileSync(SRC, 'utf8'));
{ // ── histoire.json ──
const country = Object.fromEntries(F.countries.map(c => [c.id, c]));
const gpName = Object.fromEntries(F.grandsPrix.map(g => [g.id, g.fullName]));
const round1 = v => Math.round((v || 0) * 10) / 10;
const D = {}, C = {}, CIRC = {};
for (const d of F.drivers) { const n = country[d.nationalityCountryId] || {}; D[d.id] = { id: d.id, code: d.abbreviation || null, num: d.permanentNumber ? +d.permanentNumber : null, gn: d.firstName, fn: d.lastName, nat: n.demonym || '', nat2: n.alpha2Code || null, dob: d.dateOfBirth || null, dod: d.dateOfDeath || null, born: d.placeOfBirth || null, url: null, gp: d.totalRaceStarts || 0, wins: d.totalRaceWins || 0, pod: d.totalPodiums || 0, poles: d.totalPolePositions || 0, fl: d.totalFastestLaps || 0, pts: round1(d.totalPoints), titles: d.totalChampionshipWins || 0, gs: d.totalGrandSlams || 0, sw: d.totalSprintRaceWins || 0, dotd: d.totalDriverOfTheDay || 0, laps: d.totalRaceLaps || 0, first: null, last: null, seasons: {} }; }
for (const c of F.constructors) { const n = country[c.countryId] || {}; C[c.id] = { id: c.id, name: c.name, full: c.fullName, nat: n.demonym || '', nat2: n.alpha2Code || null, url: null, gp: c.totalRaceStarts || 0, wins: c.totalRaceWins || 0, pod: c.totalPodiums || 0, poles: c.totalPolePositions || 0, pts: round1(c.totalPoints), titles: c.totalChampionshipWins || 0, fl: c.totalFastestLaps || 0, gs: 0, sw: 0, first: null, last: null, seasons: {} }; }
for (const c of F.circuits) { const n = country[c.countryId] || {}; CIRC[c.id] = { id: c.id, name: c.fullName, loc: c.placeName, country: n.name || '', nat2: n.alpha2Code || null, lat: c.latitude, lon: c.longitude, len: c.length, turns: c.turns, type: c.type, url: null, gp: 0, first: null, last: null, winners: {} }; }
const seasonsOut = [], racesOut = [];
const byYear = new Map(); for (const r of F.races) { if (!byYear.has(r.year)) byYear.set(r.year, []); byYear.get(r.year).push(r); }
for (const S of F.seasons.sort((a, b) => a.year - b.year)) {
  const y = S.year; const races = (byYear.get(y) || []).sort((a, b) => a.round - b.round);
  const seasonRaces = [];
  for (const r of races) {
    const res = r.raceResults || []; if (!res.length) { continue; } /* course à venir */
    const rows = res.map(x => { const d = D[x.driverId], c = C[x.constructorId]; const pos = x.positionNumber || null; const grid = x.gridPositionNumber || null; const pts = +x.points || 0; const fl = !!x.fastestLap;
      if (d) { d.first = d.first ?? y; d.last = y; const ds = d.seasons[y] || (d.seasons[y] = { c: new Set(), pts: 0, wins: 0, pod: 0, pos: null }); ds.c.add(x.constructorId); ds.pts += pts; if (pos === 1) ds.wins++; if (pos && pos <= 3) ds.pod++; }
      if (c) { c.first = c.first ?? y; c.last = y; const cs = c.seasons[y] || (c.seasons[y] = { pts: 0, wins: 0, pos: null }); cs.pts += pts; if (pos === 1 && !x.sharedCar) cs.wins++; }
      return [x.driverId, x.constructorId, grid, pos, x.positionText, pts, x.reasonRetired || (pos ? 'Finished' : x.positionText), fl ? 1 : 0, x.time || (x.gap ? '+' + x.gap : null), x.laps ?? null]; });
    const winner = rows.find(x => x[3] === 1), pole = res.find(x => x.polePosition), flr = rows.find(x => x[7]);
    const circ = CIRC[r.circuitId]; if (circ) { circ.gp++; circ.first = circ.first ?? y; circ.last = y; if (winner) circ.winners[winner[0]] = (circ.winners[winner[0]] || 0) + 1; }
    const name = gpName[r.grandPrixId] || r.officialName;
    seasonRaces.push({ r: r.round, name, circ: r.circuitId, date: r.date, winner: winner ? winner[0] : null, wctor: winner ? winner[1] : null, pole: pole ? pole.driverId : null, fl: flr ? flr[0] : null, laps: r.laps, len: r.courseLength });
    racesOut.push({ y, r: r.round, name, circ: r.circuitId, date: r.date, laps: r.laps, len: r.courseLength, rows });
  }
  const ds = S.driverStandings || [], cs = S.constructorStandings || [];
  for (const s of ds) { const d = D[s.driverId]; if (!d) continue; const season = d.seasons[y] || (d.seasons[y] = { c: new Set(), pts: 0, wins: 0, pod: 0, pos: null }); season.pos = s.positionNumber || null; season.pts = +s.points || season.pts; }
  for (const s of cs) { const c = C[s.constructorId]; if (!c) continue; const season = c.seasons[y] || (c.seasons[y] = { pts: 0, wins: 0, pos: null }); season.pos = s.positionNumber || null; season.pts = +s.points || season.pts; }
  const mainCtor = did => { const s = D[did] && D[did].seasons[y]; return s && s.c.size ? [...s.c][0] : null; };
  const champD = ds.find(s => s.championshipWon) || ds.find(s => s.positionNumber === 1), champC = cs.find(s => s.championshipWon) || cs.find(s => s.positionNumber === 1);
  seasonsOut.push({ y, champD: champD ? champD.driverId : null, champC: champC ? champC.constructorId : null, decided: !!(champD && champD.championshipWon), races: seasonRaces,
    topD: ds.slice(0, 10).map(s => [s.driverId, round1(s.points), D[s.driverId] && D[s.driverId].seasons[y] ? D[s.driverId].seasons[y].wins : 0, mainCtor(s.driverId)]),
    topC: cs.slice(0, 10).map(s => [s.constructorId, round1(s.points), C[s.constructorId] && C[s.constructorId].seasons[y] ? C[s.constructorId].seasons[y].wins : 0]),
    /* classements complets (sélecteur d'année de la page Championnat) : [id, points, victoires, position, écurie principale] */
    allD: ds.map(s => [s.driverId, round1(s.points), D[s.driverId] && D[s.driverId].seasons[y] ? D[s.driverId].seasons[y].wins : 0, s.positionNumber || null, mainCtor(s.driverId)]),
    allC: cs.map(s => [s.constructorId, round1(s.points), C[s.constructorId] && C[s.constructorId].seasons[y] ? C[s.constructorId].seasons[y].wins : 0, s.positionNumber || null]) });
}
const pack = (obj, isDriver) => Object.values(obj).filter(x => x.gp > 0 || x.titles > 0).map(x => ({ ...x, seasons: Object.entries(x.seasons).sort((a, b) => +a[0] - +b[0]).map(([yy, s]) => isDriver ? [+yy, [...s.c], s.pos, round1(s.pts), s.wins, s.pod] : [+yy, s.pos, round1(s.pts), s.wins]) }));
const years = seasonsOut.map(s => s.y);
const out = { built: new Date().toISOString().slice(0, 10), source: 'F1DB (CC BY 4.0)', years: [years[0], years[years.length - 1]], drivers: pack(D, true), constructors: pack(C, false), circuits: Object.values(CIRC).filter(c => c.gp > 0).map(c => ({ ...c, winners: Object.entries(c.winners).sort((a, b) => b[1] - a[1]).slice(0, 5) })), seasons: seasonsOut, races: racesOut };
writeFileSync(join(OUT, 'histoire.json'), JSON.stringify(out));
const d = out.drivers.find(x => x.id === 'juan-manuel-fangio');
console.log(`histoire.json : ${out.drivers.length} pilotes, ${out.constructors.length} écuries, ${out.seasons.length} saisons, ${out.races.length} courses, ${(JSON.stringify(out).length / 1e6).toFixed(1)} Mo · Fangio`, d && [d.gp, d.wins, d.pod, d.poles, d.titles, d.pts, d.first, d.last]);

}
{ // ── saison : schedule, drivers, constructors, lastresults, winners, sprints ──
const year = Math.max(...F.seasons.map(s => s.year));
const country = Object.fromEntries(F.countries.map(c => [c.id, c]));
const drivers = Object.fromEntries(F.drivers.map(d => [d.id, d]));
const ctors = Object.fromEntries(F.constructors.map(c => [c.id, c]));
const circuits = Object.fromEntries(F.circuits.map(c => [c.id, c]));
const gps = Object.fromEntries(F.grandsPrix.map(g => [g.id, g]));
const CIRC_ID = { melbourne: 'albert_park', montreal: 'villeneuve', spielberg: 'red_bull_ring', 'spa-francorchamps': 'spa', 'marina-bay': 'marina_bay', austin: 'americas', 'mexico-city': 'rodriguez', 'las-vegas': 'vegas', lusail: 'losail', 'yas-marina': 'yas_marina' };
const KNOWN = ['albert_park','shanghai','suzuka','bahrain','jeddah','miami','imola','monaco','villeneuve','catalunya','red_bull_ring','silverstone','spa','hungaroring','zandvoort','monza','madring','baku','sepang','marina_bay','americas','rodriguez','interlagos','vegas','losail','yas_marina'];
const races = F.races.filter(r => r.year === year).sort((a, b) => a.round - b.round);
const season = F.seasons.find(s => s.year === year);
const hhmm = t => t ? (t.length === 5 ? t + ':00Z' : t.replace(/Z?$/, 'Z')) : undefined;
const Driver = id => { const d = drivers[id]; return { driverId: id, permanentNumber: d.permanentNumber || undefined, code: d.abbreviation || undefined, givenName: d.firstName, familyName: d.lastName, dateOfBirth: d.dateOfBirth, nationality: (country[d.nationalityCountryId] || {}).demonym || '' }; };
const Constructor = id => { const c = ctors[id]; return { constructorId: id, name: c.name, nationality: (country[c.countryId] || {}).demonym || '' }; };
const Circuit = id => { const c = circuits[id]; return { circuitId: CIRC_ID[id] || id, circuitName: c.fullName, Location: { lat: String(c.latitude), long: String(c.longitude), locality: c.placeName, country: (country[c.countryId] || {}).name || '' } }; };
const raceHead = r => ({ season: String(year), round: String(r.round), raceName: (gps[r.grandPrixId] || {}).fullName || r.officialName, Circuit: Circuit(r.circuitId), date: r.date, time: hhmm(r.time) });
const sess = (d, t) => d ? { date: d, time: hhmm(t) } : undefined;
const schedule = races.map(r => ({ ...raceHead(r), FirstPractice: sess(r.freePractice1Date, r.freePractice1Time), SecondPractice: sess(r.freePractice2Date, r.freePractice2Time), ThirdPractice: sess(r.freePractice3Date, r.freePractice3Time), Qualifying: sess(r.qualifyingDate, r.qualifyingTime), Sprint: sess(r.sprintRaceDate, r.sprintRaceTime), SprintQualifying: sess(r.sprintQualifyingDate, r.sprintQualifyingTime) }));
const status = x => x.reasonRetired ? x.reasonRetired : x.positionNumber ? (x.gapLaps ? `+${x.gapLaps} Lap${x.gapLaps > 1 ? 's' : ''}` : 'Finished') : (x.positionText || '');
const Result = x => ({ number: String(x.driverNumber || ''), position: String(x.positionNumber || ''), positionText: x.positionText, points: String(x.points || 0), Driver: Driver(x.driverId), Constructor: Constructor(x.constructorId), grid: String(x.gridPositionNumber || 0), laps: String(x.laps || 0), status: status(x), Time: x.time ? { time: x.gap ? (x.gap.startsWith('+') ? x.gap : '+' + x.gap) : x.time } : undefined, FastestLap: x.fastestLap ? { rank: '1' } : undefined });
const done = races.filter(r => r.raceResults && r.raceResults.length);
const last = done[done.length - 1];
const winsD = {}, winsC = {}; for (const r of done) for (const x of r.raceResults) if (x.positionNumber === 1) { winsD[x.driverId] = (winsD[x.driverId] || 0) + 1; if (!x.sharedCar) winsC[x.constructorId] = (winsC[x.constructorId] || 0) + 1; }
const teamOf = {}; for (const e of season.entrants || []) for (const c of e.constructors) for (const d of c.drivers) teamOf[d.driverId] = c.constructorId;
for (const r of done) for (const x of r.raceResults) teamOf[x.driverId] = x.constructorId; // dernière écurie connue
const wrap = (extra) => ({ MRData: { series: 'f1', source: 'F1DB (CC BY 4.0)', built: new Date().toISOString().slice(0, 10), lastRound: last ? last.round : 0, lastDate: last ? last.date : null, ...extra } });
const rnd = String(last ? last.round : 0);
const out = {
  schedule: wrap({ total: String(schedule.length), RaceTable: { season: String(year), Races: schedule } }),
  drivers: wrap({ StandingsTable: { season: String(year), round: rnd, StandingsLists: [{ season: String(year), round: rnd, DriverStandings: (season.driverStandings || []).map(s => ({ position: String(s.positionNumber || ''), positionText: s.positionText, points: String(s.points), wins: String(winsD[s.driverId] || 0), Driver: Driver(s.driverId), Constructors: teamOf[s.driverId] ? [Constructor(teamOf[s.driverId])] : [] })) }] } }),
  constructors: wrap({ StandingsTable: { season: String(year), round: rnd, StandingsLists: [{ season: String(year), round: rnd, ConstructorStandings: (season.constructorStandings || []).map(s => ({ position: String(s.positionNumber || ''), positionText: s.positionText, points: String(s.points), wins: String(winsC[s.constructorId] || 0), Constructor: Constructor(s.constructorId) })) }] } }),
  lastresults: wrap({ RaceTable: { season: String(year), Races: last ? [{ ...raceHead(last), Results: last.raceResults.map(Result) }] : [] } }),
  winners: wrap({ RaceTable: { season: String(year), position: '1', Races: done.map(r => ({ ...raceHead(r), Results: r.raceResults.filter(x => x.positionNumber === 1).map(Result) })) } }),
  sprints: wrap({ RaceTable: { season: String(year), Races: races.filter(r => r.sprintRaceResults && r.sprintRaceResults.length).map(r => ({ ...raceHead(r), SprintResults: r.sprintRaceResults.filter(x => x.positionNumber === 1).map(Result) })) } }),
};
for (const [k, v] of Object.entries(out)) writeFileSync(join(OUT, k + '.json'), JSON.stringify(v));
const ds = out.drivers.MRData.StandingsTable.StandingsLists[0].DriverStandings;
const unknown = schedule.map(r => r.Circuit.circuitId).filter(id => !KNOWN.includes(id));
console.log(`saison ${year} : ${schedule.length} GP, ${done.length} disputés (dernier : manche ${last.round} ${last.date} ${last.circuitId}), leader ${ds[0].Driver.familyName} ${ds[0].points} pts ${ds[0].wins} V, écurie ${ds[0].Constructors[0] && ds[0].Constructors[0].name} · circuits inconnus : ${unknown.join(',') || 'aucun'}`);

}
