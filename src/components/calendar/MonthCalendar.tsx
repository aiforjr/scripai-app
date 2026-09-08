import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecordingThumb } from '@/src/components/calendar/RecordingThumb';
import { ChevronLeft, ChevronRight, VideoIcon } from '@/src/components/ui/icons';
import { buildMonthGrid, formatMonthYear } from '@/src/lib/dates';
import * as haptics from '@/src/lib/haptics';
import type { DayState } from '@/src/hooks/useMonthCompletions';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthCalendarProps {
  year: number;
  month0: number;
  dayStates: Record<string, DayState>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay?: (dayKey: string) => void;
}

export function MonthCalendar({
  year,
  month0,
  dayStates,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
}: MonthCalendarProps) {
  const cells = buildMonthGrid(year, month0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{formatMonthYear(year, month0)}</Text>
        <View style={styles.navGroup}>
          <Pressable
            onPress={() => {
              haptics.select();
              onPrevMonth();
            }}
            hitSlop={8}
            style={styles.navButton}
          >
            <ChevronLeft size={16} color={colors.neutral[700]} />
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.select();
              onNextMonth();
            }}
            hitSlop={8}
            style={styles.navButton}
          >
            <ChevronRight size={16} color={colors.neutral[700]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const state = dayStates[cell.key];
          const isMissed = cell.inMonth && !cell.isFuture && !cell.isToday && !state?.completed;
          // Unlike the fill styles below, the video still is shown on today too —
          // once the day is recorded there is a frame worth showing, and the green
          // border is what marks it as recorded either way.
          const showThumb = !!state?.hasRecording && !!state.storagePath;
          const showGlyph = !!state?.hasRecording && !cell.isToday && !showThumb;
          // A recorded day is "under review" until all three review phases are
          // done (which is what writes the completion row) — ringed yellow-orange
          // rather than green so an unfinished day is visible at a glance.
          const isUnderReview = !!state?.hasRecording && !state.completed;
          return (
            <Pressable
              key={cell.key}
              // Inside the `inMonth` guard, so a greyed leading/trailing cell
              // stays silent rather than ticking for a press that does nothing.
              onPress={() => {
                if (!cell.inMonth) return;
                haptics.select();
                onSelectDay?.(cell.key);
              }}
              style={styles.cell}
            >
              <View
                style={[
                  styles.cellInner,
                  (showThumb || showGlyph) && styles.cellThumb,
                  !showThumb && !showGlyph && state?.completed && !cell.isToday && styles.cellDone,
                  isMissed && !state?.hasRecording && styles.cellMissed,
                  cell.isToday && !showThumb && styles.cellToday,
                  !cell.inMonth && styles.cellOutside,
                  state?.hasRecording &&
                    (isUnderReview ? styles.cellUnderReview : styles.cellReviewed),
                ]}
              >
                {showThumb ? (
                  <RecordingThumb storagePath={state.storagePath!} radius={CELL_RADIUS} />
                ) : null}
                {showGlyph ? <VideoIcon size={13} color={colors.white} /> : null}
                <Text
                  style={[
                    styles.cellText,
                    state?.completed && !cell.isToday && styles.cellTextDone,
                    (showThumb || showGlyph) && styles.cellTextOnDark,
                    cell.isToday && styles.cellTextToday,
                    !cell.inMonth && styles.cellTextOutside,
                    isMissed && !state?.hasRecording && styles.cellTextMissed,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Day tiles are slightly portrait — 5:6, a little taller than square without
// going as narrow as a 9:16 video frame. The width is a percentage of the column
// rather than a fixed px so the tile can never overflow its column on a narrow
// device (a 320pt screen leaves only ~34pt per column), and the height comes from
// aspectRatio so it tracks that resolved width instead of being pinned to a
// guessed pixel height. RN reads aspectRatio as width/height, so 4/5 = taller.
const CELL_WIDTH = '86%';
const CELL_ASPECT = 5 / 6;
const CELL_RADIUS = 12;
const CELL_GUTTER = 3;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 17,
    color: colors.text,
  },
  navGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.neutral[400],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // The Pressable owns the full 1/7 column so the tap target stays finger-sized;
  // the inner view is a narrower, slightly taller tile centred within it.
  cell: {
    width: `${100 / 7}%`,
    paddingVertical: CELL_GUTTER,
    alignItems: 'center',
  },
  cellInner: {
    width: CELL_WIDTH,
    aspectRatio: CELL_ASPECT,
    borderRadius: CELL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  cellThumb: {
    backgroundColor: colors.neutral[900],
    // The still is absolutely positioned, so the tile must clip it to its radius.
    overflow: 'hidden',
  },
  // Recorded-day markers: a ring that reads at a glance across the grid,
  // independent of whatever fill or video still is underneath. Green is reserved
  // for a day whose review is actually finished; yellow-orange means the clip is
  // recorded but still under review.
  cellReviewed: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  cellUnderReview: {
    borderWidth: 2,
    borderColor: colors.pending,
  },
  cellDone: {
    backgroundColor: colors.accent[100],
  },
  cellMissed: {
    backgroundColor: colors.neutral[200],
  },
  cellToday: {
    backgroundColor: colors.accent.DEFAULT,
  },
  cellOutside: {
    opacity: 0.35,
    backgroundColor: 'transparent',
  },
  cellText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
    // Keeps the day number above the video still; on Android the native video
    // surface can otherwise paint over later siblings.
    zIndex: 1,
  },
  cellTextDone: {
    color: colors.accent.DEFAULT,
  },
  cellTextOnDark: {
    color: colors.white,
    fontSize: 10,
  },
  cellTextToday: {
    color: colors.white,
    fontFamily: typography.fontFamily.extrabold,
  },
  cellTextOutside: {
    color: colors.neutral[400],
  },
  cellTextMissed: {
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
});
