import { StyleSheet, View } from 'react-native';

export function ReelClip() {
  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <View style={styles.reelAnchor}>
        <View style={styles.reelOuter}>
          <View style={styles.reelInner} />
        </View>
        <View style={styles.cord} />
        <View style={styles.clip}>
          <View style={styles.clipSlot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
  },
  reelAnchor: {
    alignItems: 'center',
  },
  reelOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D7DEE8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF99',
    boxShadow: '0 8px 18px rgba(0, 0, 0, 0.3)',
  },
  reelInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7B8797',
    borderWidth: 4,
    borderColor: '#F8FAFC',
  },
  cord: {
    width: 4,
    height: 18,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: '#BAC4D2',
  },
  clip: {
    width: 70,
    height: 18,
    marginTop: -3,
    borderRadius: 9,
    backgroundColor: '#E7ECF3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFFB3',
  },
  clipSlot: {
    width: 36,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
});
