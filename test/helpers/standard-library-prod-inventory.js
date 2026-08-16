'use strict';

/**
 * Stable legacy row identities from read-only prod inventory (2026-08-16).
 * UUIDs are stable legacy row identities for disposition testing.
 */
function createProdInventoryState() {
  const activities = [
    { id: '04f83f52-8f56-4b43-a802-6a886c4835f0', name: 'Vakna', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'fe6a63b8-de4c-4588-a472-92220b31e988', name: 'Klä på sig', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '38e154a0-26a8-4bd8-a3a8-7c25e3d64284', name: 'Vakna & klä på sig', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '2484db15-329f-46a7-9000-af36fecb55aa', name: 'Toalett', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '200f451a-e927-4e9b-b093-fbec37bfe804', name: 'Frukost', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '4ef3f612-f3d2-4846-a1c6-6d7940899aef', name: 'Äta frukost', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '78919e23-ec3c-4cf7-8977-a7a2cc79b964', name: 'Äta frukost', package_component: 'teacch', canonical_id: null, deprecated: false, seven_questions: { who: { text: 'Själv' } } },
    { id: '8e58bf54-4c1d-4713-9732-203f92cc9dfa', name: 'Borsta tänderna (morgon)', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'f3f8a933-3924-4e26-a789-d5e00fae78df', name: 'Borsta tänderna (kväll)', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '09131c4b-04ce-45e9-b8da-34087d2fe781', name: 'Borsta tänderna', package_component: 'teacch', canonical_id: null, deprecated: false, seven_questions: { who: { text: 'Själv' } } },
    { id: 'a929d120-8026-4cc0-8c19-f12758976f78', name: 'Tvätta händerna', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '71b2df9f-dde4-432e-ad32-7efc4084bd17', name: 'Packa skolväska', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '995ac9fb-63a3-4ff8-89a7-61779be5be8a', name: 'Packa väska', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '142fb6a2-b596-4b59-a89d-b34fdab364aa', name: 'Förskola', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '6e8aa608-553b-41da-850a-1dfc2351c666', name: 'Skola', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '00486684-fee8-4aa3-a6c5-3e5abfe9e9c0', name: 'Mellanmål', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '3a89fd07-5b76-4d8d-a639-ae8b72b2b49a', name: 'Lunch', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '4049afb8-a2c0-4faf-8f04-e0fc6c4f46e7', name: 'Middag', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'e67665f7-24b7-408a-ab6e-472630d3bf1b', name: 'Leka fritt', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '2c109d5c-426f-427a-8f8d-e3179296dab9', name: 'Läxa', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '112536af-70c5-402c-9cc1-c976567c05b8', name: 'Läxor', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '2c8c56a5-e275-46b9-98aa-a3cb3247d5c7', name: 'Duscha', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'a6306461-161f-4fe4-a56e-d4cc0efc6932', name: 'Bada/Duscha', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '1e0ad42e-4475-4fe2-8199-539bf446ff5a', name: 'Pyjamas', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '23b661c1-1f39-4ab0-98f1-1df2761bba24', name: 'Godnattsaga', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '8d601d91-8462-48c1-ad21-40d6cc7116e6', name: 'Läsa själv', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'bfaa5c88-7877-4af6-82a8-53af93be8a04', name: 'Sova', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '241ce5ad-d04d-49a2-85fa-9a6c7121e143', name: 'Utflykt / Park', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '266b190a-dba9-462b-9e7d-9c9b3210ecab', name: 'Familjaktivitet', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '97b21116-c82a-4841-b608-ee6a9d3c6f0c', name: 'Pyssel', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '195559c9-6aa3-49ed-8113-1d41d289c174', name: 'Leka ute', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '83bce17a-cead-47e4-88b0-30f13d56c170', name: 'Sätta på skor', package_component: 'teacch', canonical_id: null, deprecated: false, seven_questions: { who: { text: 'Själv' } } },
    { id: '066c18c7-e9f2-4b12-b0af-0c45a6646a3b', name: 'Rast & lek', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '1a6ddaa4-31c4-4083-b476-3b35fdaa0475', name: 'Mata husdjuret', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '543b9028-37b8-44ba-9eef-3b68dd501542', name: 'Bädda sängen', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'e011a50e-f981-4cda-a141-10f19d4fa6d5', name: 'Borsta håret', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '7e044024-6a5e-4ff6-a672-67378c2d3d4f', name: 'Duka av', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '5cb7a135-fc5c-4aec-9882-55786088ce0a', name: 'Hjälpa till', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'a65480c7-0bee-4815-8033-84ee7b8f01fd', name: 'Hämta post', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'b8a966c1-c440-4af3-8c8c-f296739ed324', name: 'Frukost i lugn & ro', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'b5a039d7-5074-4a74-bade-c01786de26fb', name: 'Musik/Dans', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '6ff91c6b-4887-47e1-aa3b-66a361b4638c', name: 'Sova ut', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '77b420d6-ca79-43f3-8ea8-a20d463f07b1', name: 'Städa rummet', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '89b93461-ce89-4b52-b289-9028746329ce', name: 'Träning/Aktivitet', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '27c88002-2fb4-4eec-b944-67949967476e', name: 'Läxor / Pyssel', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: 'dd513553-83b7-450c-bd38-e822f7098df2', name: 'Film / Pyssel', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
    { id: '5fe8a168-c06e-4ffd-92e1-9f74d805908e', name: 'Yoga/Stretching', package_component: null, canonical_id: null, deprecated: false, seven_questions: {} },
  ];

  const schedules = [
    { id: '1a9ae210-dc3f-44da-a7ee-be0f8caf8af9', name: 'Lov', canonical_id: null, deprecated: false },
    { id: '519498aa-a123-4362-83d5-95b1fce31e49', name: 'Kort morgon', canonical_id: null, deprecated: false },
    { id: '52e04d83-c780-4e6b-9ed4-dce020eb7eea', name: 'Kvällsrutin', canonical_id: null, deprecated: false },
    { id: '5e53ca9b-9aa3-4c93-a481-1445e375f88a', name: 'Helg', canonical_id: null, deprecated: false },
    { id: '69d03529-dc25-448b-9d01-f7ec8335fd66', name: 'Jullov', canonical_id: null, deprecated: false },
    { id: '9f34eecd-1429-4c6c-ae1f-59f505413910', name: 'Förskola vardag', canonical_id: null, deprecated: false },
    { id: 'abb5d436-170e-4ab5-aded-65d898314193', name: 'Skola vardag', canonical_id: null, deprecated: false },
    { id: 'dff15b3a-6628-4003-bf86-fcc9c003630f', name: 'Sommarlov', canonical_id: null, deprecated: false },
  ];

  return {
    activities,
    schedules,
    scheduleItems: [],
    rewards: Array.from({ length: 17 }, (_, i) => ({ id: `reward-${i}`, name: `Reward ${i + 1}` })),
    counts: {
      activities: activities.length,
      schedules: schedules.length,
      scheduleItems: 85,
      inlineScheduleItems: 61,
      rewards: 17,
    },
  };
}

module.exports = {
  createProdInventoryState,
};
