// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StealthRegistry
 * @notice Announces stealth payments so receivers can scan and sweep funds.
 *
 * FLOW:
 *  1. Sender computes a one-time stealth address off-chain.
 *  2. Sender sends native MON to that stealth address.
 *  3. Sender calls `announce()` on this contract, publishing the
 *     ephemeral public key so the receiver can derive the private key.
 *  4. Receiver scans `Announcement` events, tries each ephemeral key
 *     against their own stealth meta-address to find matches.
 *  5. Receiver sweeps funds from the stealth address.
 */
contract StealthRegistry {

    /// @notice Emitted when a stealth payment is announced.
    /// @param caller        The address that called announce (the sender).
    /// @param stealthAddr   The one-time stealth address holding the funds.
    /// @param ephemeralPubKey The compressed ephemeral public key (33 bytes).
    /// @param metadata      Optional extra data (e.g. view tag for fast scanning).
    event Announcement(
        address indexed caller,
        address indexed stealthAddr,
        bytes   ephemeralPubKey,
        bytes   metadata
    );

    /// @notice Publish an announcement after sending funds to a stealth address.
    /// @param stealthAddr     The stealth address that received the funds.
    /// @param ephemeralPubKey  The sender's ephemeral public key (33 bytes compressed).
    /// @param metadata        Optional metadata (can be empty).
    function announce(
        address stealthAddr,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external {
        emit Announcement(msg.sender, stealthAddr, ephemeralPubKey, metadata);
    }

    /// @notice Convenience: send native MON to a stealth address AND announce in one tx.
    /// @param stealthAddr     The computed stealth address.
    /// @param ephemeralPubKey  The sender's ephemeral public key.
    /// @param metadata        Optional metadata.
    function sendAndAnnounce(
        address stealthAddr,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external payable {
        // Forward the entire msg.value to the stealth address
        (bool ok, ) = stealthAddr.call{value: msg.value}("");
        require(ok, "Transfer failed");

        emit Announcement(msg.sender, stealthAddr, ephemeralPubKey, metadata);
    }
}
