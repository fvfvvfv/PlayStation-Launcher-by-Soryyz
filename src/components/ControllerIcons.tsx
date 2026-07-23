import type { ControllerType } from "../hooks/useGamepad";

interface Props {
  type: ControllerType;
}

export interface Icons {
  ConfirmIcon: () => React.ReactNode;
  BackIcon: () => React.ReactNode;
  LbIcon: () => React.ReactNode;
  RbIcon: () => React.ReactNode;
  TabLIcon: () => React.ReactNode;
  TabRIcon: () => React.ReactNode;
  DpadNav: () => React.ReactNode;
  SearchIcon: () => React.ReactNode;
  ToggleIcon: () => React.ReactNode;
  LtIcon: () => React.ReactNode;
  RtIcon: () => React.ReactNode;
  ViewToggleIcon: () => React.ReactNode;
  R3Icon: () => React.ReactNode;
  BackspaceIcon: () => React.ReactNode;
  ShiftIcon: () => React.ReactNode;
  ShiftActiveIcon: () => React.ReactNode;
  ArrowUpIcon: () => React.ReactNode;
  ArrowDownIcon: () => React.ReactNode;
  ArrowLeftIcon: () => React.ReactNode;
  ArrowRightIcon: () => React.ReactNode;
  SelectIcon: () => React.ReactNode;
}

function SvgIcon({ path, flip, size = 36 }: { path: string; flip?: boolean; size?: number }) {
  return (
    <img
      src={path}
      alt=""
      draggable={false}
      style={{
        width: size,
        height: size,
        display: "block",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

function BackspaceSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  );
}

function ShiftSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" />
      <line x1="12" y1="6" x2="12" y2="20" />
    </svg>
  );
}

function ShiftActiveSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" />
      <line x1="12" y1="6" x2="12" y2="20" />
      <line x1="7" y1="20" x2="17" y2="20" />
    </svg>
  );
}

function ArrowUpSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ArrowDownSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowLeftSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRightSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ControllerIcons({ type }: Props): Icons {
  const shared = {
    BackspaceIcon: () => <BackspaceSvg />,
    ShiftIcon: () => <ShiftSvg />,
    ShiftActiveIcon: () => <ShiftActiveSvg />,
    ArrowUpIcon: () => <ArrowUpSvg />,
    ArrowDownIcon: () => <ArrowDownSvg />,
    ArrowLeftIcon: () => <ArrowLeftSvg />,
    ArrowRightIcon: () => <ArrowRightSvg />,
  };

  if (type === "ps") {
    return {
      ConfirmIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Cross 1.svg" />,
      BackIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Circle 1.svg" />,
      LbIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS L1.svg" />,
      RbIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS R1.svg" />,
      TabLIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS L1.svg" />,
      TabRIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS R1.svg" />,
      DpadNav: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Directional Arrows.svg" />,
      SearchIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Square 1.svg" />,
      ToggleIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Triangle 1.svg" />,
      LtIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS L2.svg" size={32} />,
      RtIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS R2.svg" size={32} />,
      ViewToggleIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Analogue L.svg" size={36} />,
      R3Icon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Analogue R.svg" size={28} />,
      SelectIcon: () => <SvgIcon path="/icons/PS_iconpack/Button - PS Options.svg" size={36} />,
      ...shared,
    };
  }

  return {
    ConfirmIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_a_1.svg" />,
    BackIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_b_1.svg" />,
    LbIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_bumper_dark_1.svg" />,
    RbIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_bumper_dark_2.svg" />,
    TabLIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_bumper_dark_1.svg" />,
    TabRIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_bumper_dark_2.svg" />,
    DpadNav: () => <SvgIcon path="/icons/XBOX_iconpack/button_xboxone_dpad_dark_7.svg" />,
    SearchIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_x_1.svg" />,
    ToggleIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_y_1.svg" />,
    LtIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_analog_trigger_dark_1.svg" size={32} />,
    RtIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_analog_trigger_dark_2.svg" size={32} />,
    ViewToggleIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xboxone_digital_analog_click_light_4.svg" size={36} />,
    R3Icon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xboxone_digital_analog_click_light_5.svg" size={28} />,
    SelectIcon: () => <SvgIcon path="/icons/XBOX_iconpack/button_xbox_digital_view_1.svg" size={36} />,
    ...shared,
  };
}
