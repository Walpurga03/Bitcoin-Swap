<script lang="ts">
  import '../app.css';
  import DonationButton from '$lib/components/DonationButton.svelte';
</script>

<slot />

<!-- Lightning Donation Button auf allen Seiten -->
<DonationButton />