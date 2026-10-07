import React from "react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";

interface TourWelcomeDialogProps {
  open: boolean;
  userName?: string;
  onAccept: () => void;
  onPostpone: () => void;
  onDecline: () => void;
}

const TourWelcomeDialog: React.FC<TourWelcomeDialogProps> = ({
  open,
  userName,
  onAccept,
  onPostpone,
  onDecline,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onPostpone()}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>
          {userName ? `Welcome, ${userName.split(" ")[0]}` : "Welcome to PACT"}
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Would you like a quick tour of the application?
        </Dialog.Description>

        <Text as="p" size="2" mb="5" color="gray">
          It takes about a minute and covers the navigation menu, conformance
          testing, and how nodes connect on the PACT Network. You can leave it at
          any point.
        </Text>

        <Flex gap="3" justify="end" wrap="wrap">
          <Button variant="ghost" color="gray" onClick={onDecline}>
            No thanks
          </Button>
          <Button variant="soft" color="gray" onClick={onPostpone}>
            Remind me later
          </Button>
          <Button onClick={onAccept}>Take the tour</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default TourWelcomeDialog;
