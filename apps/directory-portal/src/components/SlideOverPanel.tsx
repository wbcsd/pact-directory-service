import React from "react";
import { Dialog, Flex, IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Content
        maxWidth="700px"
        onOpenAutoFocus={(e) => e.preventDefault()}
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