import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import {
  stylistAvailabilityService,
  StylistSchedule,
  DayWindow,
  DEFAULT_SCHEDULE,
  toMinutes,
  fromMinutes,
} from '../services/stylistAvailabilityService';

const WEEKDAYS = [
  { key: '1', label: 'Monday' },
  { key: '2', label: 'Tuesday' },
  { key: '3', label: 'Wednesday' },
  { key: '4', label: 'Thursday' },
  { key: '5', label: 'Friday' },
  { key: '6', label: 'Saturday' },
  { key: '0', label: 'Sunday' },
];

const START_OPTIONS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
const END_OPTIONS = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const SLOT_OPTIONS = [30, 60, 90];
const LEAD_OPTIONS = [0, 12, 24, 48];

export default function StylistAvailabilityScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weekly, setWeekly] = useState<Record<string, DayWindow[]>>({});
  const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [leadTimeHours, setLeadTimeHours] = useState(24);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const existing = await stylistAvailabilityService.getSchedule(getCurrentUserId());
      const source: Omit<StylistSchedule, 'stylistId' | 'updatedAt'> = existing || DEFAULT_SCHEDULE;
      setWeekly(source.weekly || {});
      setBlackoutDates(source.blackoutDates || []);
      setSlotMinutes(source.slotMinutes || 60);
      setLeadTimeHours(source.leadTimeHours ?? 24);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (key: string) => {
    setWeekly(prev => {
      const next = { ...prev };
      if (next[key]?.length) {
        delete next[key];
      } else {
        next[key] = [{ start: '09:00', end: '17:00' }];
      }
      return next;
    });
  };

  const updateWindow = (key: string, field: keyof DayWindow, value: string) => {
    setWeekly(prev => {
      const window = prev[key]?.[0] || { start: '09:00', end: '17:00' };
      const next = { ...window, [field]: value };
      // A window that ends before it starts would silently produce zero slots.
      if (toMinutes(next.end) <= toMinutes(next.start)) return prev;
      return { ...prev, [key]: [next] };
    });
  };

  const toggleBlackout = (day: DateData) => {
    setBlackoutDates(prev =>
      prev.includes(day.dateString)
        ? prev.filter(d => d !== day.dateString)
        : [...prev, day.dateString]
    );
  };

  const handleSave = async () => {
    if (Object.keys(weekly).length === 0) {
      Alert.alert(
        'No working days set',
        'Turn on at least one day, otherwise clients will see no availability at all.'
      );
      return;
    }

    setSaving(true);
    try {
      await stylistAvailabilityService.saveSchedule(getCurrentUserId(), {
        weekly,
        blackoutDates,
        slotMinutes,
        leadTimeHours,
      });
      Alert.alert('Availability saved', 'Clients can now book the times you published.');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Could not save', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const markedBlackouts = Object.fromEntries(
    blackoutDates.map(d => [d, { selected: true, selectedColor: colors.tobacco }])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR AVAILABILITY</Text>
        <Text style={styles.title}>When can clients book you?</Text>
        <Text style={styles.subtitle}>
          Clients only ever see times you publish here, minus anything already booked.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>WEEKLY HOURS</Text>
            {WEEKDAYS.map(day => {
              const windows = weekly[day.key];
              const on = !!windows?.length;
              const window = windows?.[0];

              return (
                <View key={day.key} style={styles.dayBlock}>
                  <View style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Switch
                      value={on}
                      onValueChange={() => toggleDay(day.key)}
                      trackColor={{ true: colors.ink, false: colors.sand }}
                    />
                  </View>

                  {on && window && (
                    <View style={styles.windowRow}>
                      <View style={styles.windowCol}>
                        <Text style={styles.windowLabel}>FROM</Text>
                        <View style={styles.chipWrap}>
                          {START_OPTIONS.map(t => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.timeChip, window.start === t && styles.timeChipActive]}
                              onPress={() => updateWindow(day.key, 'start', t)}
                            >
                              <Text
                                style={[
                                  styles.timeChipText,
                                  window.start === t && styles.timeChipTextActive,
                                ]}
                              >
                                {fromMinutes(toMinutes(t))}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.windowCol}>
                        <Text style={styles.windowLabel}>UNTIL</Text>
                        <View style={styles.chipWrap}>
                          {END_OPTIONS.map(t => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.timeChip, window.end === t && styles.timeChipActive]}
                              onPress={() => updateWindow(day.key, 'end', t)}
                            >
                              <Text
                                style={[
                                  styles.timeChipText,
                                  window.end === t && styles.timeChipTextActive,
                                ]}
                              >
                                {fromMinutes(toMinutes(t))}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={styles.sectionLabel}>SESSION LENGTH</Text>
            <View style={styles.chipWrap}>
              {SLOT_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.timeChip, slotMinutes === m && styles.timeChipActive]}
                  onPress={() => setSlotMinutes(m)}
                >
                  <Text style={[styles.timeChipText, slotMinutes === m && styles.timeChipTextActive]}>
                    {m} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>MINIMUM NOTICE</Text>
            <View style={styles.chipWrap}>
              {LEAD_OPTIONS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.timeChip, leadTimeHours === h && styles.timeChipActive]}
                  onPress={() => setLeadTimeHours(h)}
                >
                  <Text
                    style={[styles.timeChipText, leadTimeHours === h && styles.timeChipTextActive]}
                  >
                    {h === 0 ? 'None' : `${h}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>DAYS OFF</Text>
            <Text style={styles.helper}>
              Tap any date to block it out entirely. Tap again to unblock.
            </Text>
            <Calendar
              onDayPress={toggleBlackout}
              markedDates={markedBlackouts}
              minDate={new Date().toISOString().slice(0, 10)}
              theme={{
                calendarBackground: colors.bone,
                textSectionTitleColor: colors.inkFaint,
                monthTextColor: colors.ink,
                dayTextColor: colors.ink,
                textDisabledColor: colors.inkFaint,
                arrowColor: colors.tobacco,
                todayTextColor: colors.tobacco,
                textDayFontFamily: fonts.sans,
                textMonthFontFamily: fonts.serif,
                textDayHeaderFontFamily: fonts.sansSemiBold,
              }}
            />

            <Button
              title={saving ? 'Saving…' : 'Save availability'}
              onPress={handleSave}
              fullWidth
              disabled={saving}
              style={{ marginTop: spacing.section }}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  helper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  dayBlock: { marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hair },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  windowRow: { marginTop: spacing.sm, gap: spacing.sm },
  windowCol: { marginBottom: 4 },
  windowLabel: { ...textType.microLabel, color: colors.inkFaint, marginBottom: 6 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  timeChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  timeChipText: { fontFamily: fonts.sans, fontSize: 12, color: colors.ink, lineHeight: 16 },
  timeChipTextActive: { color: colors.white },
});
