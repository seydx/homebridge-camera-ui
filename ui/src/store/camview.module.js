const layout = JSON.parse(localStorage.getItem('camview-layout'));
const initialState = { layout: layout || [] };

export const camview = {
  namespaced: true,
  state: initialState,
  actions: {
    updateElements: ({ commit }, payload) => {
      commit('updateElements', payload);
      return layout;
    },
  },
  mutations: {
    updateElements: (state, payload) => {
      localStorage.setItem('camview-layout', JSON.stringify(payload));
      state.layout = payload;
    },
  },
};
