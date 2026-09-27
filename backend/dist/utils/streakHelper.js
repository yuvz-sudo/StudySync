"use strict";
/**
 * Streak Calculation Utility for StudySync.
 * Determines if a completed study session increments, maintains, or resets a user's study streak.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateUpdatedStreak = void 0;
const calculateUpdatedStreak = (lastActiveAt, currentStreak, longestStreak, sessionEndTime = new Date()) => {
    if (!lastActiveAt) {
        // First time studying
        return {
            newCurrentStreak: 1,
            newLongestStreak: Math.max(1, longestStreak),
            streakIncremented: true,
        };
    }
    const sessionDate = new Date(sessionEndTime);
    sessionDate.setHours(0, 0, 0, 0);
    const lastActiveDate = new Date(lastActiveAt);
    lastActiveDate.setHours(0, 0, 0, 0);
    const diffTime = sessionDate.getTime() - lastActiveDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
        // Already studied today - maintain current streak
        return {
            newCurrentStreak: currentStreak,
            newLongestStreak: longestStreak,
            streakIncremented: false,
        };
    }
    else if (diffDays === 1) {
        // Studied yesterday - increment streak!
        const newStreak = currentStreak + 1;
        return {
            newCurrentStreak: newStreak,
            newLongestStreak: Math.max(newStreak, longestStreak),
            streakIncremented: true,
        };
    }
    else {
        // Streak broken (missed at least one day) - reset to 1
        return {
            newCurrentStreak: 1,
            newLongestStreak: longestStreak,
            streakIncremented: true,
        };
    }
};
exports.calculateUpdatedStreak = calculateUpdatedStreak;
//# sourceMappingURL=streakHelper.js.map