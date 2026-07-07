import React, { useEffect, useState } from "react";
import { Dialog, Flex, IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import "./SlideOverPanel.css";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  slide?: boolean;
  children: React.ReactNode;
}

const slideStyles: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: "50%",
  maxWidth: "none",
  margin: 0,
  borderRadius: 0,
  height: "100vh",
  overflowY: "auto",
};

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open,
  onClose,
  title,
  subtitle,
  slide = false,
  children,
}) => {
  // Keep the Dialog mounted while it animates closed so Radix can clean up
  // (e.g. removing pointer-events:none from <body>).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Content
        maxWidth={slide ? undefined : "700px"}
        className={slide ? "slide-over-dialog" : undefined}
        style={slide ? slideStyles : undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onAnimationEnd={() => {
          if (!open) setMounted(false);
        }}
      >
        <Flex justify="between" align="center" mb="4">
          <Flex direction="column" gap="1">
            <Dialog.Title size="4" weight="bold">{title}</Dialog.Title>
            {subtitle && (
              <Dialog.Description size="2" color="gray">
                {subtitle}
              </Dialog.Description>
            )}
          </Flex>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close">
              <Cross2Icon width={18} height={18} />
            </IconButton>
          </Dialog.Close>
        </Flex>
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SlideOverPanel;

/*
      <Dialog.Portal container={document.querySelector("[data-is-root-theme]") ?? undefined}>
        <Dialog.Overlay className="slide-over-overlay" />
        <Dialog.Content
          className="slide-over-content"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="slide-over-header">
            <div className="slide-over-header-left">
              <Dialog.Title asChild>
                <h2>{title}</h2>
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description asChild>
                  <p className="slide-over-subtitle">{subtitle}</p>
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="slide-over-close" aria-label="Close">
                <Cross2Icon width={18} height={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="slide-over-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
*/