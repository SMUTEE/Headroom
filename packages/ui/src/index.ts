/**
 * @headroom/ui — the Headroom design system.
 *
 * Portable by design (DECISIONS.md, D-19). This package must never import
 * from @headroom/domain or @headroom/data: components take primitives and
 * callbacks, never domain objects, so the system can be lifted into another
 * project without dragging a billing engine with it.
 *
 * Styles are imported once, from the app root:
 *   import '@headroom/ui/styles.css'
 */

export { cn } from './lib/cn';
export { ThemeToggle, themeScript, type Appearance } from './theme/theme';

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/button';

export {
  Callout,
  Card,
  CardHeader,
  EmptyState,
  Metric,
  type CalloutProps,
  type CalloutTone,
  type CardProps,
  type MetricProps,
  type Trend,
} from './components/surfaces';

export {
  NumberField,
  SegmentedControl,
  Slider,
  type NumberFieldProps,
  type SegmentedControlProps,
  type SegmentedOption,
  type SliderProps,
} from './components/controls';

export {
  Badge,
  Meter,
  Table,
  Td,
  Th,
  Tr,
  type BadgeTone,
  type MeterMarker,
  type MeterProps,
} from './components/data';
