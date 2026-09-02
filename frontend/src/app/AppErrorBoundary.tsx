import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "@/pages/error";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render-time crashes anywhere in the app and shows the 500 surface.
 *  Lives inside RouterProvider so the surface's actions can navigate; "Try
 *  again" resets the boundary to re-attempt the failed render. */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the crash in the console for diagnosis; production wiring to an
    // error reporter can hook in here.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorPage variant="500" onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
