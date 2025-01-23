#!/bin/sh

set -eux

DEV=/dev/sdb
TMP=$(mktemp -d)
MNT=$(mktemp -d)

# clean up
# shellcheck disable=SC2064
trap "sudo -n umount '$MNT'; rm -rf '$TMP' '$MNT'" EXIT

# ignition
podman run --rm -i quay.io/coreos/butane:release \
    --pretty --strict <coreos/config.bu >coreos/config.ign

# install coreos
sudo podman run --rm --privileged -i -v /dev:/dev -v /run/udev:/run/udev -v .:/data:ro \
    quay.io/coreos/coreos-installer:release \
    install -a aarch64 -i /data/coreos/config.ign "$DEV"

# get firmware
podman run --rm -i -v "$TMP":/data:z fedora:36 \
    dnf install --downloadonly -y --forcearch=aarch64 --destdir=/data uboot-images-armv8 bcm283x-firmware bcm283x-overlays
for RPM in "$TMP"/*.rpm; do
    rpm2cpio "$RPM" | cpio -id -D "$TMP"
done
mv "$TMP/usr/share/uboot/rpi_arm64/u-boot.bin" "$TMP/boot/efi/rpi-u-boot.bin"

# install firmware
lsblk "$DEV" -oLABEL,PATH  |
awk '$1=="EFI-SYSTEM" { print $2 }' |
sudo xargs -i mount {} "$MNT"
sudo rsync -avh --ignore-existing "$TMP/boot/efi/" "$MNT"
