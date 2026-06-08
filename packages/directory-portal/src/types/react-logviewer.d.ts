declare module "@melloware/react-logviewer" {
  import { CSSProperties } from "react";

  export interface LazyLogProps {
    text?: string;
    url?: string;
    stream?: boolean;
    height?: string | number;
    width?: string | number;
    follow?: boolean;
    scrollToLine?: number;
    highlight?: number | number[];
    selectableLines?: boolean;
    enableSearch?: boolean;
    caseInsensitive?: boolean;
    extraLines?: number;
    onLoad?: () => void;
    onHighlight?: (range: { first: number; last: number }) => void;
    onError?: (error: Error) => void;
    rowHeight?: number;
    overscanRowCount?: number;
    style?: CSSProperties;
    containerStyle?: CSSProperties;
    formatPart?: (text: string) => React.ReactNode;
  }

  export class LazyLog extends React.Component<LazyLogProps> {}
  
  export default LazyLog;
}
