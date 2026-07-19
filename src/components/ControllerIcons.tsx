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

export function ControllerIcons({ type }: Props): Icons {
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
  };
}
