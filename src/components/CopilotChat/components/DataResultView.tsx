import { useMemo } from 'react';
import { Alert, Card, Col, Row, Statistic, Table, Tag, theme } from 'antd';
import { useCopilot } from '../context';
import ChartBlock from './ChartBlock';

/**
 * 设备数据工具结果渲染：把 read_device_data / read_waveform 的 JSON 转成直观的
 * 表格 / 统计卡片 / 波形曲线，替代纯 JSON 文本。
 *
 * 识别规则（对应 agent/tools/platform 后端返回结构）：
 *  - 波形：parsed.decoded === true 且 Array.isArray(parsed.channels)
 *    → 各通道统计卡片 + samples_preview 波形曲线
 *  - 时序：Array.isArray(parsed.messages)
 *    → 统计 + 消息表格（时间 / 测点名 / 类型 / 值 / 单位 或 波形路径）
 *  - 其它形态返回 null，交由上层回退到 JsonView。
 */

function fmtTime(ns: number): string {
  if (!ns || Number.isNaN(ns)) return '—';
  const d = new Date(ns / 1e6);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 波形通道：统计卡片 + samples_preview 曲线 */
function WaveformChannels({ channels }: { channels: any[] }) {
  const { token } = theme.useToken();
  return (
    <div>
      {channels.map((c) => {
        const samples: number[] = Array.isArray(c.samples_preview) ? c.samples_preview : [];
        const statRow: Array<{ title: string; value: number | string; suffix?: string; precision?: number }> = [
          { title: '采样率', value: c.sample_rate != null ? `${c.sample_rate} Hz` : '—' },
          { title: '样本数', value: c.sample_count != null ? c.sample_count : '—' },
          { title: '时长', value: c.duration || '—' },
        ];
        if (typeof c.min === 'number')
          statRow.push({ title: '最小值', value: c.min, precision: 4 });
        if (typeof c.max === 'number')
          statRow.push({ title: '最大值', value: c.max, precision: 4 });
        if (typeof c.avg === 'number')
          statRow.push({ title: '平均值', value: c.avg, precision: 6 });
        if (typeof c.rms === 'number')
          statRow.push({ title: 'RMS', value: c.rms, precision: 4 });

        const chartOption = samples.length
          ? {
              tooltip: { trigger: 'axis' },
              grid: { left: 55, right: 20, top: 40, bottom: 40 },
              xAxis: { type: 'category', name: '样本序号', data: samples.map((_, i) => String(i)) },
              yAxis: { type: 'value', name: '加速度(m/s²)' },
              series: [
                {
                  name: '波形',
                  type: 'line',
                  showSymbol: samples.length <= 100,
                  symbolSize: 3,
                  data: samples,
                },
              ],
            }
          : null;

        return (
          <div key={c.index} style={{ marginBottom: 12 }}>
            <Row gutter={[12, 8]}>
              {statRow.map((s) => (
                <Col key={s.title} xs={12} sm={8} md={4}>
                  <Statistic
                    title={s.title}
                    value={typeof s.value === 'number' ? s.value : (s.value as any)}
                    suffix={s.suffix}
                    precision={s.precision}
                    valueStyle={{ fontSize: 15 }}
                  />
                </Col>
              ))}
            </Row>
            {c.start_time && (
              <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                采集起始：{c.start_time}
              </div>
            )}
            {chartOption ? (
              <div style={{ marginTop: 8 }}>
                <ChartBlock option={chartOption as any} height={220} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
                无样本预览，无法绘制曲线。
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 时序消息：趋势图 + 统计 + 表格 */
function TimeSeriesMessages({ value }: { value: any }) {
  const { token } = theme.useToken();
  const { t } = useCopilot();
  const intl = { formatMessage: (d: { id: string }, v?: Record<string, unknown>) => t(d.id, v as any) };
  const fm = (id: string) => t(id);

  const msgs = useMemo<any[]>(
    () => (Array.isArray(value?.messages) ? value.messages : []),
    [value],
  );
  const stats = value?.stats;

  // 数值型时序点（value 为数值、非波形文件）→ 趋势图
  const numeric = useMemo(() => msgs.filter((m) => typeof m.value === 'number'), [msgs]);
  const chartOption = useMemo(() => {
    const bc = value?.chart;
    if (bc && typeof bc.option === 'object' && bc.option) return bc.option;
    return buildTrendChart(numeric);
  }, [value, numeric]);

  const dataSource = msgs.map((m, i) => ({
    key: i,
    time: fmtTime(Number(m.time)),
    name: m.metric_name || m.name || '—',
    type: m.data_type || '—',
    unit: m.unit || '',
    val: typeof m.value === 'number' ? m.value : '',
    string_value: m.string_value || '',
  }));

  const columns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 150 },
    { title: '测点名', dataIndex: 'name', key: 'name', width: 230 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (v: string) => (
        <Tag color={v === '波形' ? 'purple' : 'green'} style={{ marginInlineEnd: 0 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: '数值',
      dataIndex: 'val',
      key: 'val',
      width: 140,
      render: (v: unknown, r: any) =>
        v === '' || v == null ? (
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>（波形文件）</span>
        ) : (
          <span>
            {Number(v).toPrecision(6)}
            {r.unit ? <span style={{ color: token.colorTextSecondary, fontSize: 12 }}> {r.unit}</span> : ''}
          </span>
        ),
    },
    {
      title: '波形对象键',
      dataIndex: 'string_value',
      key: 'string_value',
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: token.colorTextSecondary }}>
            {v}
          </span>
        ) : null,
    },
  ];

  return (
    <div>
      {stats && typeof stats.count === 'number' && stats.count > 0 && (
        <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
          {['avg', 'min', 'max'].map((k) =>
            typeof stats[k] === 'number' ? (
              <Col key={k} xs={8} sm={4}>
                <Statistic
                  title={k.toUpperCase()}
                  value={stats[k]}
                  precision={4}
                  styles={{content: { fontSize: 15 }}}
                />
              </Col>
            ) : null,
          )}
        </Row>
      )}
      {value?.data_type && typeof value.data_type === 'object' && (
        <div style={{ marginBottom: 8, fontSize: 12, color: token.colorTextSecondary }}>
          {Object.entries(value.data_type)
            .map(([k, v]) => `${k} ${v} 条`)
            .join(' · ')}
        </div>
      )}
      {chartOption && (
        <div style={{ marginBottom: 8 }}>
          <ChartBlock option={chartOption as any} height={240} />
        </div>
      )}
      <Table
        size="small"
        columns={columns as never}
        dataSource={dataSource}
        pagination={msgs.length > 10 ? { pageSize: 10, size: 'small' } : false}
        scroll={{ x: 760 }}
      />
      <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4 }}>
        {intl.formatMessage({ id: 'copilot.msg.total.count' }, { n: msgs.length })}
      </div>
    </div>
  );
}

/** 由数值型时序点构建 ECharts 趋势图（按测点名分组、按时间排序） */
function buildTrendChart(points: any[]): Record<string, unknown> | null {
  if (!points.length) return null;
  const ordered = [...points].sort((a, b) => Number(a.time) - Number(b.time));
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const p of ordered) {
    const lb = fmtTime(Number(p.time));
    if (!seen.has(lb)) {
      seen.add(lb);
      labels.push(lb);
    }
  }
  const seriesMap = new Map<string, (number | null)[]>();
  const seriesOrder: string[] = [];
  for (const p of ordered) {
    const name = p.metric_name || p.name || '—';
    if (!seriesMap.has(name)) {
      seriesMap.set(name, labels.map(() => null));
      seriesOrder.push(name);
    }
  }
  // 每个点落到对应时间标签
  const idxOf = new Map(labels.map((lb, i) => [lb, i]));
  for (const p of ordered) {
    const name = p.metric_name || p.name || '—';
    const arr = seriesMap.get(name)!;
    arr[idxOf.get(fmtTime(Number(p.time)))!] = Number(p.value);
  }
  const series = seriesOrder.map((name) => ({
    name,
    type: 'line',
    showSymbol: labels.length <= 60,
    symbolSize: 3,
    data: seriesMap.get(name),
  }));
  const unit = points.find((p) => p.unit)?.unit || '';
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 55, right: 20, top: 40, bottom: 45 },
    legend: seriesOrder.length > 1 ? { data: seriesOrder } : undefined,
    xAxis: { type: 'category', name: '时间', data: labels, axisLabel: { rotate: labels.length > 8 ? 45 : 0 } },
    yAxis: { type: 'value', name: unit },
    series,
  };
}

/** 识别波形 / 时序 / 频谱结果并渲染；无法识别返回 null（由上层回退 JsonView）。 */
/** 判断是否为 DataResultView 支持的三种结构（供调用方决定是否渲染，避免条件 hooks）。 */
export function canRenderDataResult(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value.decoded && Array.isArray(value.channels)) return true;
  if (value.fft && Array.isArray(value.fft.freq)) return true;
  if (Array.isArray(value.messages) && value.messages.length > 0) return true;
  return false;
}

export default function DataResultView({ value }: { value: any }) {
  if (!value || typeof value !== 'object') return null;
  if (value.decoded === true && Array.isArray(value.channels)) {
    return (
      <div>
        {value.summary ? (
          <div style={{ marginBottom: 8, fontSize: 13 }}>{value.summary}</div>
        ) : null}
        <WaveformChannels channels={value.channels} />
        {value.path ? (
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <Tag>bucket: {value.bucket || '—'}</Tag>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value.path}</span>
          </div>
        ) : null}
      </div>
    );
  }
  if (value.fft && Array.isArray(value.fft.freq) && Array.isArray(value.fft.magnitude)) {
    return <SpectrumView value={value} />;
  }
  if (Array.isArray(value.messages)) {
    return <TimeSeriesMessages value={value} />;
  }
  return null;
}

/** 波形 FFT 频谱：幅值谱折线 + 基频/倍频/边带/轴承故障竖线标记 + 转速/轴承输入提醒。 */
function SpectrumView({ value }: { value: any }) {
  const { token } = theme.useToken();
  const fft = value.fft;
  const fund = value.fundamental || {};
  const harmonics: any[] = Array.isArray(value.harmonics) ? value.harmonics : [];
  const sidebands: any[] = Array.isArray(value.sidebands) ? value.sidebands : [];
  const bf: Record<string, any> = value.bearing_faults || {};
  const needs = value.needs_input || {};
  const hasFundamental = fund.provided === true;
  // 轴承故障线：仅统计已换算出 Hz（>0）的阶次，缺转速时为 0 不绘制
  const hasBearingLines = Object.values(bf).some((v) => {
    const hz = v && typeof v === 'object' ? Number((v as any).hz) : Number(v);
    return Number.isFinite(hz) && hz > 0;
  });

  const statRow: Array<{ title: string; value: string | number }> = [
    { title: '采样率', value: value.sample_rate != null ? `${value.sample_rate} Hz` : '—' },
    { title: '样本数', value: value.sample_count != null ? value.sample_count : '—' },
    { title: '频率分辨率', value: fft.resolution_hz != null ? `${trim(fft.resolution_hz)} Hz` : '—' },
    { title: 'Nyquist', value: fft.nyquist_hz != null ? `${trim(fft.nyquist_hz)} Hz` : '—' },
    { title: '基频 f0', value: hasFundamental && fund.hz != null && Number(fund.hz) > 0 ? `${trim(fund.hz)} Hz` : '—' },
    { title: '转速', value: hasFundamental && fund.rpm != null && Number(fund.rpm) > 0 ? `${trim(fund.rpm)} RPM` : '—' },
    { title: '基频来源', value: hasFundamental ? '按提供参数' : '未提供' },
    { title: '倍频/谐波', value: harmonics.length ? `${harmonics.length} 条` : '未提供参数' },
  ];

  const spectrumOption = useMemo(() => {
    const f = value.fft;
    if (!f || !Array.isArray(f.freq) || !Array.isArray(f.magnitude)) return null;
    const markData: any[] = [];
    for (const h of harmonics) {
      markData.push({
        xAxis: Number(h.hz),
        label: { formatter: `${h.order}x ${trim(h.hz)}Hz`, fontSize: 10 },
        lineStyle: {
          color: h.type === 'fundamental' ? '#f5222d' : '#fa8c16',
          type: 'solid',
          width: h.type === 'fundamental' ? 2 : 1,
        },
      });
    }
    for (const s of sidebands) {
      markData.push({
        xAxis: Number(s.hz),
        label: { formatter: `SB ${trim(s.hz)}Hz`, fontSize: 9 },
        lineStyle: { color: '#1890ff', type: 'dashed', width: 1 },
      });
    }
    for (const [k, v] of Object.entries(bf)) {
      const bv = v as any;
      const hz = bv && typeof bv === 'object' ? Number(bv.hz) : Number(bv);
      if (!Number.isFinite(hz) || hz <= 0) continue; // 缺转速未换算 → 不绘制
      const order = bv && typeof bv === 'object' ? bv.order : null;
      markData.push({
        xAxis: hz,
        label: { formatter: `${k.toUpperCase()} ${order != null ? `${trim(order)}×` : ''}${trim(hz)}Hz`, fontSize: 9 },
        lineStyle: { color: '#722ed1', type: 'dashed', width: 1 },
      });
    }
    return {
      tooltip: { trigger: 'axis' },
      toolbox: {
        right: 6,
        top: 2,
        itemSize: 14,
        feature: {
          dataZoom: { yAxisIndex: 'none', title: { zoom: '缩放', back: '还原' } },
          restore: { title: '还原' },
        },
        iconStyle: { borderColor: token.colorTextSecondary },
        emphasis: { iconStyle: { borderColor: token.colorText } },
      },
      dataZoom: [
        { type: 'inside' },
        {
          type: 'slider',
          height: 16,
          bottom: 6,
          start: 0,
          end: 100,
          borderColor: 'transparent',
          backgroundColor: token.colorFillTertiary,
          fillerColor: 'rgba(91,143,249,.18)',
          handleStyle: { color: '#5B8FF9' },
          textStyle: { color: token.colorTextSecondary, fontSize: 10 },
        },
      ],
      grid: { left: 60, right: 34, top: 20, bottom: 52 },
      xAxis: { type: 'value', name: '频率(Hz)', scale: true },
      yAxis: { type: 'value', name: '幅值', scale: true },
      series: [
        {
          name: '幅值谱',
          type: 'line',
          showSymbol: false,
          lineStyle: { width: 1 },
          data: f.freq.map((fq: number, i: number) => [fq, f.magnitude[i]]),
          markLine: { silent: true, symbol: 'none', label: { position: 'insideEndTop' }, data: markData },
        },
      ],
    };
  }, [value, harmonics, sidebands, bf, token]);

  const showNeeds = typeof needs.message === 'string' && needs.message.length > 0;

  return (
    <div>
      {value.summary ? <div style={{ marginBottom: 8, fontSize: 13 }}>{value.summary}</div> : null}
      <Row gutter={[12, 8]} style={{ marginBottom: 8 }}>
        {statRow.map((s) => (
          <Col key={s.title} xs={12} sm={8} md={3}>
            <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 14 }} />
          </Col>
        ))}
      </Row>
      <div style={{ marginBottom: 8, fontSize: 12, color: token.colorTextSecondary }}>
        {harmonics.length > 0 ? (
          <>
            <Tag color="red" style={{ marginInlineEnd: 4 }}>1x 基频</Tag>
            <Tag color="orange" style={{ marginInlineEnd: 4 }}>2x~6x 谐波</Tag>
          </>
        ) : null}
        {sidebands.length > 0 ? <Tag color="blue" style={{ marginInlineEnd: 4 }}>— 边带</Tag> : null}
        {hasBearingLines ? <Tag color="purple" style={{ marginInlineEnd: 4 }}>— 轴承故障</Tag> : null}
        {harmonics.length === 0 && sidebands.length === 0 && !hasBearingLines ? (
          <span>未提供转速/轴承特征频率，仅显示幅值谱</span>
        ) : null}
      </div>
      {spectrumOption ? (
        <div style={{ marginBottom: 8 }}>
          <ChartBlock option={spectrumOption} height={260} />
        </div>
      ) : (
        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>频谱数据无效，无法绘制。</div>
      )}
      {showNeeds && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 4 }}
          title="如需更精确的倍频 / 轴承故障边带，请补充以下参数"
          description={needs.message}
        />
      )}
      {value.path ? (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          <Tag>bucket: {value.bucket || '—'}</Tag>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value.path}</span>
        </div>
      ) : null}
    </div>
  );
}

function trim(v: unknown): string {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v ?? '—');
  return String(Math.round(n * 1000) / 1000);
}
