package governance

import (
	"context"
	"testing"

	"github.com/maximhq/bifrost/framework/configstore"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type wrappedStore struct {
	*LocalGovernanceStore
}

// TestRegisteredStoreWrapperIsUsed: Init builds the plugin on the wrapper's store, so the
// resolver, the tracker and GetGovernanceStore all share it.
func TestRegisteredStoreWrapperIsUsed(t *testing.T) {
	var seen *LocalGovernanceStore
	RegisterStoreWrapper(func(local *LocalGovernanceStore) (GovernanceStore, error) {
		seen = local
		return &wrappedStore{local}, nil
	})
	t.Cleanup(func() { RegisterStoreWrapper(nil) })

	p, err := Init(context.Background(), nil, NewMockLogger(), nil, &configstore.GovernanceConfig{}, nil, nil, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = p.Cleanup() })
	require.NotNil(t, seen)
	w, ok := p.GetGovernanceStore().(*wrappedStore)
	require.True(t, ok, "the plugin runs on the wrapped store")
	assert.Same(t, seen, w.LocalGovernanceStore)
	assert.Same(t, p.GetGovernanceStore(), p.resolver.store)
}

func TestNoWrapperKeepsTheLocalStore(t *testing.T) {
	p, err := Init(context.Background(), nil, NewMockLogger(), nil, &configstore.GovernanceConfig{}, nil, nil, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = p.Cleanup() })
	_, ok := p.GetGovernanceStore().(*LocalGovernanceStore)
	assert.True(t, ok)
}
