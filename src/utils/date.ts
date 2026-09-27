export type DateType = string | number | Date | null | undefined;

/**
 * 安全解析时间
 */
const parseDate = (value: DateType): Date | null => {
  if (value == null) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * 数字前置补 0
 */
const pad = (num: number): string => num.toString().padStart(2, '0');

/**
 * 自定义时间格式化
 * @param value 时间
 * @param format 格式化字符串 YYYY-MM-DD HH:mm:ss
 */
export const formatDate = (value: DateType, format: string): string => {
  const date = parseDate(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return format
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year % 100))
    .replace(/MM/g, pad(month))
    .replace(/M/g, String(month))
    .replace(/DD/g, pad(day))
    .replace(/D/g, String(day))
    .replace(/HH/g, pad(hours))
    .replace(/H/g, String(hours))
    .replace(/mm/g, pad(minutes))
    .replace(/m/g, String(minutes))
    .replace(/ss/g, pad(seconds))
    .replace(/s/g, String(seconds));
};

/**
 * 格式化：YYYY-MM-DD HH:mm:ss
 */
export const formatDateTime = (value: DateType): string => {
  const date = parseDate(value);
  if (!date) return '';

  if (date.getFullYear() <= 1) {
    return '---';
  }

  return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
};

/**
 * 相对时间：几分钟 / 几小时 / 几天 / 几周 / 几月 / 几年前
 */
export const formatRelativeTime = (value: DateType, formatter: (key: string) => string): string => {
  const date = parseDate(value);
  if (!date) return formatter('component.utils.date.not.updated');

  const now = new Date();
  const target = new Date(date);

  const diff = now.getTime() - target.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return formatter('component.utils.date.just.now');
  if (diff < hour)
    return `${Math.floor(diff / minute)} ${formatter('component.utils.date.minute.ago')}`;
  if (diff < day) return `${Math.floor(diff / hour)} ${formatter('component.utils.date.hour.ago')}`;
  if (diff < week) return `${Math.floor(diff / day)} ${formatter('component.utils.date.day.ago')}`;

  // 精确判断是否已满一整年
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  if (target >= oneYearAgo) {
    const monthDiff =
      now.getMonth() - target.getMonth() + 12 * (now.getFullYear() - target.getFullYear());
    if (monthDiff > 0) {
      return `${monthDiff} ${formatter('component.utils.date.month.ago')}`;
    }
    return `${Math.floor(diff / week)} ${formatter('component.utils.date.week.ago')}`;
  }

  // 超过1年，展示绝对日期
  return formatDate(target, 'YYYY-MM-DD');
};

/**
 * 判断是否被编辑过
 */
export const isEdited = (createTime: DateType, updateTime: DateType): boolean => {
  const c = parseDate(createTime);
  const u = parseDate(updateTime);
  return !!(c && u && c.getTime() !== u.getTime());
};
