<script lang="ts">
  import '../app.css';
  import DonationButton from '$lib/components/DonationButton.svelte';
  import UnifiedNotificationSystem from '$lib/components/UnifiedNotificationSystem.svelte';
</script>

<slot />

<!-- Unified Notification System auf allen Seiten -->
<UnifiedNotificationSystem />

<!-- Lightning Donation Button auf allen Seiten -->
<DonationButton />