import { Text } from "@/components/shared";
import { getPublicUser } from "@/services/user";
import { isOutgoing, type Transaction } from "@/types/api";
import { useQuery } from "@tanstack/react-query";

/** "Sent to Ada Obi" / "Received from Ada Obi", from GET /users/{id} (public fields only). */
export default function CounterpartyName({
  transaction,
  accountId,
  className,
}: {
  transaction: Transaction;
  accountId?: string;
  className?: string;
}) {
  const outgoing = isOutgoing(transaction, accountId);
  const otherId = outgoing ? transaction.recipient_id : transaction.sender_id;
  const { data } = useQuery({
    queryKey: ["public-user", otherId],
    queryFn: () => getPublicUser(otherId),
    enabled: !!otherId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const name = data
    ? `${data.first_name} ${data.last_name}`.trim() || `@${data.username}`
    : null;
  return (
    <Text className={className} numberOfLines={2}>
      {outgoing ? "Sent" : "Received"}
      {name ? (outgoing ? ` to ${name}` : ` from ${name}`) : ""}
    </Text>
  );
}
