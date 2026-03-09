import { MapEvent, EventCategory } from '../types';

/**
 * Calculates a compound threat risk score from 1-100.
 * Factors:
 * 1. Category Severity (Military/Explosion > Protest > Politics)
 * 2. HotScore (Number of reports)
 * 3. Source Reliability (A > B > C)
 * 4. Recency (Decays over time)
 */
export function calculateThreatScore(event: MapEvent): number {
    let score = 0;

    // 1. Category Base Score
    const categoryWeights: Record<EventCategory, number> = {
        military: 40,
        explosion: 50,
        protest: 20,
        politics: 15,
        humanitarian: 10,
        other: 5,
    };
    score += categoryWeights[event.category] || 5;

    // 2. HotScore (Reporting Volume)
    // Each point in hotScore adds 5 points, max 25
    score += Math.min(25, (event.hotScore || 1) * 5);

    // 3. Reliability
    const reliabilityWeights = {
        A: 20,
        B: 10,
        C: 5,
    };
    score += reliabilityWeights[event.reliability || 'C'];

    // 4. Recency Decay
    const hoursOld = (Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 24) {
        score *= 0.7; // 30% reduction if older than 24h
    }

    return Math.min(100, Math.round(score));
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
}
