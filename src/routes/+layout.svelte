<script lang="ts">
  import '../app.css';
  import DonationButton from '$lib/components/DonationButton.svelte';
  
  // Akzeptiere params Prop um Svelte Warning zu vermeiden
  export let params: any = undefined;
</script>

<slot />

<!-- Lightning Donation Button auf allen Seiten -->
<DonationButton />